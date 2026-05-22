import express from 'express';
import path from 'path';
import os from 'os';
import fs from 'fs';
import fsp from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import simpleGit from 'simple-git';
import rimraf from 'rimraf';
import https from 'https';
import { exec } from 'child_process';
import { promisify } from 'util';
import AdmZip from 'adm-zip';

const execPromise = promisify(exec);
const router = express.Router();

interface CleanedUrl {
  owner: string;
  repo: string;
  cloneUrl: string;
}

function cleanGitHubUrl(inputUrl: string): CleanedUrl {
  let urlStr = inputUrl.trim();
  urlStr = urlStr.replace(/\/+$/, '');
  
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

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const request = (targetUrl: string) => {
      https.get(targetUrl, {
        headers: {
          'User-Agent': 'WormGPT-Skill-Installer'
        }
      }, (response) => {
        if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          request(response.headers.location);
          return;
        }
        if (response.statusCode !== 200) {
          reject(new Error(`Código de estado HTTP ${response.statusCode}`));
          return;
        }
        response.pipe(file);
        file.on('finish', () => {
          file.close(resolve as any);
        });
      }).on('error', (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
    };
    request(url);
  });
}

async function copyDir(src: string, dest: string): Promise<void> {
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
  const { repoUrl } = req.body as { repoUrl?: string };
  if (!repoUrl) {
    return res.status(400).json({ error: 'La URL es requerida' });
  }

  let cleaned: CleanedUrl;
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

    try {
      const git = simpleGit();
      await git.clone(cloneUrl, tempDir, ['--depth', '1']);
      clonedSuccessfully = true;
    } catch (gitErr: any) {
      console.warn('Git clone failed, falling back to ZIP download:', gitErr.message);
      const zipPath = path.join(os.tmpdir(), `skill-zip-${uuidv4()}.zip`);
      try {
        await downloadFile(`https://api.github.com/repos/${owner}/${repo}/zipball`, zipPath);
        const zip = new AdmZip(zipPath);
        zip.extractAllTo(tempDir, true);
        clonedSuccessfully = true;
      } catch (zipErr: any) {
        console.error('Fallback ZIP download also failed:', zipErr.message);
        return res.status(500).json({ 
          error: 'Error al descargar el repositorio de GitHub.', 
          details: `Git clone y descarga ZIP fallaron. Detalle: ${zipErr.message}` 
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

    const walk = async (dir: string): Promise<string | null> => {
      const entries = await fsp.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          const found = await walk(full);
          if (found) return found;
        } else if (entry.isFile() && entry.name.toUpperCase() === 'SKILL.MD') {
          return full;
        }
      }
      return null;
    };

    const skillMdPath = await walk(tempDir);
    if (!skillMdPath) {
      return res.status(404).json({ error: 'Estructura de skill no encontrada (no se encontró el archivo SKILL.md).' });
    }

    const content = await fsp.readFile(skillMdPath, 'utf-8');
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'El archivo SKILL.md está vacío o es inválido.' });
    }

    const skillSourceDir = path.dirname(skillMdPath);
    const skillFolderName = path.basename(skillSourceDir);

    const skillsBaseDir = path.resolve(path.join(process.cwd(), 'skills'));
    const destSkillDir = path.join(skillsBaseDir, skillFolderName);

    await fsp.mkdir(skillsBaseDir, { recursive: true });
    
    if (fs.existsSync(destSkillDir)) {
      await new Promise<void>((resolve) => rimraf(destSkillDir, () => resolve()));
    }
    
    await copyDir(skillSourceDir, destSkillDir);

    const reqPath = path.join(destSkillDir, 'requirements.txt');
    const pkgPath = path.join(destSkillDir, 'package.json');

    if (fs.existsSync(reqPath)) {
      try {
        await execPromise(`pip install -r "${reqPath}"`);
      } catch (err1) {
        try {
          await execPromise(`pip3 install -r "${reqPath}"`);
        } catch (err2) {
          try {
            await execPromise(`python -m pip install -r "${reqPath}"`);
          } catch (err3: any) {
            return res.status(500).json({ 
              error: 'Error de dependencias', 
              details: `Error al instalar dependencias de Python (requirements.txt): ${err3.message}` 
            });
          }
        }
      }
    }

    if (fs.existsSync(pkgPath)) {
      try {
        await execPromise(`npm install`, { cwd: destSkillDir });
      } catch (err: any) {
        return res.status(500).json({ 
          error: 'Error de dependencias', 
          details: `Error al instalar dependencias de Node.js (package.json): ${err.message}` 
        });
      }
    }

    res.json({ name: skillFolderName, content, url: repoUrl });

  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Error interno al procesar la skill', details: err.message });
  } finally {
    if (fs.existsSync(tempDir)) {
      await new Promise<void>((resolve) => rimraf(tempDir, () => resolve()));
    }
  }
});

export default router;
