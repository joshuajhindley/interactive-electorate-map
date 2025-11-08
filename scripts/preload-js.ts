import fs from 'fs'
import path from 'path'

const distDir = path.resolve('dist')
const assetsDir = path.join(distDir, 'assets')

// Find the CSS file with a hash
const jsFile = fs.readdirSync(assetsDir).find((f) => f.endsWith('.js'))
if (!jsFile) {
  throw new Error('No JS file found')
}

const htmlPath = path.join(distDir, 'index.html')
const html = fs.readFileSync(htmlPath, 'utf8')

// Replace the <link> tag with inline <style>
const updatedHtml = html.replace(/<meta name="viewport"/, `<link rel="modulepreload" href="/interactive-electorate-map/assets/${jsFile}" />\n    <meta name="viewport"`)

fs.writeFileSync(htmlPath, updatedHtml)
console.log(`Added ${jsFile} to be preloaded in index.html`)
