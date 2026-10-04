async function search(query) {
  try {
    const res = await fetch('https://html.duckduckgo.com/html/?q=' + encodeURIComponent(query), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    const text = await res.text();
    const results = [];
    const regex = /<a class="result__url" href="([^"]+)".*?>(.*?)<\/a>.*?<a class="result__snippet[^>]*>(.*?)<\/a>/gs;
    let match;
    while ((match = regex.exec(text)) !== null && results.length < 5) {
      results.push({
        url: match[1].trim(),
        title: match[2].replace(/<[^>]+>/g, '').trim(),
        snippet: match[3].replace(/<[^>]+>/g, '').trim()
      });
    }
    console.log(JSON.stringify(results, null, 2));
  } catch (e) {
    console.error(e);
  }
}
search(process.argv[2] || 'wormgpt');
