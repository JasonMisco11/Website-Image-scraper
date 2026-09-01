const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const targetUrl = 'https://ogassociatestech.com/';
const downloadDir = path.join(__dirname, 'public', 'images', 'og_site');

if (!fs.existsSync(downloadDir)) {
  fs.mkdirSync(downloadDir, { recursive: true });
}

https.get(targetUrl, (res) => {
  let html = '';
  res.on('data', (chunk) => html += chunk);
  res.on('end', () => {
    // Basic regex to find image sources
    const imgRegex = /<img[^>]+src="?([^"\s]+)"?[^>]*>/g;
    let match;
    const imageUrls = new Set();
    
    while ((match = imgRegex.exec(html)) !== null) {
      let imgUrl = match[1];
      if (imgUrl.startsWith('/')) {
        imgUrl = new URL(imgUrl, targetUrl).href;
      }
      imageUrls.add(imgUrl);
    }
    
    // Also look for background images in inline styles or anything ending in jpg/png/webp/svg
    const urlRegex = /(https?:\/\/[^\s"'()]+(?:jpg|jpeg|png|webp|svg|gif))/gi;
    while ((match = urlRegex.exec(html)) !== null) {
      imageUrls.add(match[1]);
    }

    console.log(`Found ${imageUrls.size} images to download.`);
    
    let downloaded = 0;
    
    imageUrls.forEach(url => {
      if (!url.startsWith('http')) return;
      
      const fileName = path.basename(new URL(url).pathname);
      if (!fileName || !fileName.includes('.')) return; // Skip if no extension
      
      const filePath = path.join(downloadDir, fileName);
      
      const client = url.startsWith('https') ? https : http;
      client.get(url, (imgRes) => {
        if (imgRes.statusCode === 200) {
          const fileStream = fs.createWriteStream(filePath);
          imgRes.pipe(fileStream);
          fileStream.on('finish', () => {
            fileStream.close();
            downloaded++;
            console.log(`Downloaded [${downloaded}]: ${fileName}`);
          });
        }
      }).on('error', err => {
        console.error(`Error downloading ${url}: ${err.message}`);
      });
    });
  });
}).on('error', (err) => {
  console.error('Failed to fetch the webpage:', err);
});
