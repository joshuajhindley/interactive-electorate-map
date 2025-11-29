import fs from 'fs'
import path from 'path'

const distDir = path.resolve('dist')
const assetsDir = path.join(distDir, 'assets')

// Find the CSS file with a hash
const cssFile = fs.readdirSync(assetsDir).find((f) => f.endsWith('.css'))
if (!cssFile) {
  throw new Error('No CSS file found')
}

const css = fs.readFileSync(path.join(assetsDir, cssFile), 'utf8')
const htmlPath = path.join(distDir, 'index.html')
const html = fs.readFileSync(htmlPath, 'utf8')

// Replace the <link> tag with inline <style>
const updatedHtml = html.replace(/<link rel="stylesheet".*?>/, `<style>${css}</style>`)

fs.writeFileSync(htmlPath, updatedHtml)
fs.unlinkSync(path.join(assetsDir, cssFile))
console.log(`Inlined ${cssFile} into index.html`)
