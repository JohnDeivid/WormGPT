import express from 'express';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { promises as fsp } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import simpleGit from 'simple-git';
import { rimraf } from 'rimraf';
import https from 'https';
import { exec } from 'child_process';
import { promisify } from 'util';
import AdmZip from 'adm-zip';

const execPromise = promisify(exec);
const router = express.Router();

// Helper to clean and validate standard GitHub URL
function cleanGitHubUrl(inputUrl) {
  let urlStr = inputUrl.trim();
  // Remove trailing slashes
  urlStr = urlStr.replace(/\/+$/, '');
  
  // Matches standard GitHub repo URL, ignoring branches or subpaths like tree/main or blob/master
  const match = urlStr.match(/https?:\/\/(?:www\.)?github\.com\/([^\/]+)\/([^\/\?#]+)/i);
  if (!match) {
    throw new Error('URL de GitHub no válida. Debe ser una URL de repositorio de GitHub.');
  }
  
  const owner = match[1];
  let repo = match[2];
  
  if (repo.endsWith('.git')) {
    repo = repo.slice(0, -4);
  }
  
  return {
    owner,
    repo,
    cloneUrl: `https://github.com/${owner}/${repo}.git`
  };
}

// Helper to download a file over HTTPS (handles redirects)
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const request = (targetUrl) => {
      https.get(targetUrl, {
        headers: {
          'User-Agent': 'WormGPT-Skill-Installer'
        }
      }, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          request(response.headers.location);
          return;
        }
        if (response.statusCode !== 200) {
          reject(new Error(`Código de estado HTTP ${response.statusCode}`));
          return;
        }
        response.pipe(file);
        file.on('finish', () => {
          file.close(resolve);
        });
      }).on('error', (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
    };
    request(url);
  });
}

// Helper to copy directory recursively
async function copyDir(src, dest) {
  await fsp.mkdir(dest, { recursive: true });
  const entries = await fsp.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fsp.copyFile(srcPath, destPath);
    }
  }
}

router.post('/skill', async (req, res) => {
  const { repoUrl, skillName } = req.body;
  if (!repoUrl) {
    return res.status(400).json({ error: 'La URL es requerida' });
  }

  let cleaned;
  try {
    cleaned = cleanGitHubUrl(repoUrl);
  } catch (err) {
    return res.status(400).json({ error: 'URL inválida. Asegúrate de introducir una URL válida de un repositorio de GitHub.' });
  }

  const { owner, repo, cloneUrl } = cleaned;
  const tempDir = path.join(os.tmpdir(), `skill-${uuidv4()}`);
  let clonedSuccessfully = false;

  try {
    await fsp.mkdir(tempDir, { recursive: true });

    // Step 2: Try git clone --depth 1
    try {
      const git = simpleGit();
      await git.clone(cloneUrl, tempDir, ['--depth', '1']);
      clonedSuccessfully = true;
    } catch (gitErr) {
      console.warn('Git clone failed, falling back to ZIP download:', gitErr.message);
      // Fallback: Download default branch ZIP ball from GitHub API
      const zipPath = path.join(os.tmpdir(), `skill-zip-${uuidv4()}.zip`);
      try {
        await downloadFile(`https://api.github.com/repos/${owner}/${repo}/zipball`, zipPath);
        const zip = new AdmZip(zipPath);
        zip.extractAllTo(tempDir, true);
        clonedSuccessfully = true;
      } catch (zipErr) {
        console.error('Fallback ZIP download also failed:', zipErr.message);
        return res.status(500).json({ 
          error: 'Error al descargar el repositorio de GitHub.', 
          details: `Git clone error: ${gitErr.message}. ZIP download error: ${zipErr.message}` 
        });
      } finally {
        if (fs.existsSync(zipPath)) {
          await fsp.unlink(zipPath).catch(() => {});
        }
      }
    }

    if (!clonedSuccessfully) {
      return res.status(500).json({ error: 'No se pudo obtener el repositorio de GitHub.' });
    }

    // Step 3: Detect all skill folders recursively (where SKILL.md lies)
    const findAllSkillMd = async (dir, results) => {
      const entries = await fsp.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await findAllSkillMd(full, results);
        } else if (entry.isFile() && entry.name.toUpperCase() === 'SKILL.MD') {
          results.push(full);
        }
      }
    };
    const skillMdPaths = [];
    await findAllSkillMd(tempDir, skillMdPaths);
    if (skillMdPaths.length === 0) {
      return res.status(404).json({ error: 'Estructura de skill no encontrada (no se encontró el archivo SKILL.md).' });
    }
    // Prepare response array
    const installedSkills = [];
    for (const skillMdPath of skillMdPaths) {
      // Validate content
      const content = await fsp.readFile(skillMdPath, 'utf-8');
      if (!content || content.trim().length === 0) {
        // Skip empty skill definitions
        continue;
      }
      // Determine if only one skill was found; use custom name only in that case
      const singleSkill = skillMdPaths.length === 1;
      const skillSourceDir = path.dirname(skillMdPath);
      const skillFolderName = skillName && typeof skillName === 'string' && skillName.trim().length > 0 && singleSkill ? skillName.trim() : path.basename(skillSourceDir);
      const skillsBaseDir = path.resolve(path.join(process.cwd(), 'skills'));
      const destSkillDir = path.join(skillsBaseDir, skillFolderName);
      await fsp.mkdir(skillsBaseDir, { recursive: true });
      if (fs.existsSync(destSkillDir)) {
        await rimraf(destSkillDir);
      }
      await copyDir(skillSourceDir, destSkillDir);
      // Install dependencies if any
      const reqPath = path.join(destSkillDir, 'requirements.txt');
      const pkgPath = path.join(destSkillDir, 'package.json');
      if (fs.existsSync(reqPath)) {
        try {
          await execPromise(`pip install -r "${reqPath}"`);
        } catch (e1) {
          try {
            await execPromise(`pip3 install -r "${reqPath}"`);
          } catch (e2) {
            try {
              await execPromise(`python -m pip install -r "${reqPath}"`);
            } catch (e3) {
              return res.status(500).json({ error: 'Error de dependencias', details: `Error pip install for ${skillFolderName}: ${e3.message}` });
            }
          }
        }
      }
      if (fs.existsSync(pkgPath)) {
        try {
          await execPromise(`npm install`, { cwd: destSkillDir });
        } catch (e) {
          return res.status(500).json({ error: 'Error de dependencias', details: `Error npm install for ${skillFolderName}: ${e.message}` });
        }
      }
      installedSkills.push({ name: skillFolderName, content, url: repoUrl });
    }
    if (installedSkills.length === 0) {
      return res.status(400).json({ error: 'No se pudieron instalar skills válidas.' });
    }
    res.json({ installed: installedSkills });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno al procesar la skill', details: err.message });
  } finally {
    // Cleanup temporary directory
    if (fs.existsSync(tempDir)) {
      await rimraf(tempDir);
    }
  }
});

// ─── Create Skill from Text (Import) ─────────────────────────────────────────
router.post('/skill/create', async (req, res) => {
  const { name, description, content } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'El nombre de la skill es requerido.' });
  }
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'El contenido de la skill es requerido.' });
  }

  try {
    const safeName = name.trim().replace(/[<>:"/\\|?*]/g, '_');
    const skillsBaseDir = path.resolve(path.join(process.cwd(), 'skills'));
    const destSkillDir = path.join(skillsBaseDir, safeName);
    await fsp.mkdir(destSkillDir, { recursive: true });

    const skillMdContent = `---\nname: ${safeName}\ndescription: ${(description || '').trim()}\n---\n\n${content.trim()}\n`;

    await fsp.writeFile(path.join(destSkillDir, 'SKILL.md'), skillMdContent, 'utf-8');

    res.json({
      success: true,
      skill: { name: safeName, description: (description || '').trim(), content: skillMdContent }
    });
  } catch (err) {
    console.error('[/api/skill/create] Error:', err.message);
    res.status(500).json({ error: 'Error al guardar la skill en el servidor.', details: err.message });
  }
});

// ─── Delete Skill ─────────────────────────────────────────────────────────────
router.post('/skill/delete', async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'El nombre de la skill es requerido.' });
  }

  try {
    const safeName = name.trim().replace(/[<>:"/\\|?*]/g, '_');
    const skillsBaseDir = path.resolve(path.join(process.cwd(), 'skills'));
    const destSkillDir = path.join(skillsBaseDir, safeName);

    if (fs.existsSync(destSkillDir)) {
      await rimraf(destSkillDir);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[/api/skill/delete] Error:', err.message);
    res.status(500).json({ error: 'Error al eliminar la skill del servidor.', details: err.message });
  }
});

export default router;
