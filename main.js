var selected = 'close-race'

var specialNameMap = {
  "hauraki-waikato": "Hauraki-Waikato",
  "ikaroa-rawhiti": "Ikaroa-Rāwhiti",
  "kaikoura": "Kaikōura",
  "kaipara-ki-mahurangi": "Kaipara ki Mahurangi",
  "mangere": "Māngere",
  "ohariu": "Ōhāriu",
  "otaki": "Ōtaki",
  "panmure-otahuhu": "Panmure-Ōtāhuhu",
  "rangitikei": "Rangitīkei",
  "tamaki": "Tāmaki",
  "tamaki-makaurau": "Tāmaki Makaurau",
  "taranaki-king-country": "Taranaki-King Country",
  "taupo": "Taupō",
  "te-atatu": "Te Atatū",
  "te-tai-hauauru": "Te Tai Hauāuru",
  "west-coast-tasman": "West Coast-Tasman",
  "whangaparaoa": "Whangaparāoa",
  "whangarei": "Whangārei",
}

var ratingToColourMap = {
  "close-race": "#767171",
  "lab": "#d00a12",
  "nat": "#1e4882",
  "grn": "#0ca747",
  "act": "#f3ca1e",
  "tpm": "#c37d23",
  "top": "#09B598",
  "nzf": "#000000",
}

var colourToRatingMap = {
  "#767171": "close-race",
  "#d00a12": "lab",
  "#1e4882": "nat",
  "#0ca747": "grn",
  "#f3ca1e": "act",
  "#c37d23": "tpm",
  "#09B598": "top",
  "#000000": "nzf",
}

async function handlePageLoad() {
  await fetch('./2020-results.svg').then(resp => resp.text()).then(text => document.getElementById('svg').innerHTML = text)

  var optionsElems = document.getElementsByClassName("options")
  for (var optionsElem of optionsElems) {
    for (var option of optionsElem.children) {
      if (option.className !== "help") {
        option.setAttribute("onclick", "updateSelected(id)")
      }
    }
  }

  var pathElems = document.querySelectorAll("path")
  for (var pathElem of pathElems) {
    const label = pathElem.getAttribute('inkscape:label')
    if (label !== null) {
      const tooltipText = specialNameMap[label] || formatLabel(label)
      pathElem.setAttribute('onclick', "handlePathClick(event)")
      pathElem.setAttribute('onmouseover', `showTooltip('${tooltipText}')`)
      pathElem.setAttribute('onmouseleave', "hideTooltip()")
    }
  }
}

function formatLabel(label) {
  var splitStr = label.toLowerCase().split('-')
   for (var i = 0; i < splitStr.length; i++) {
      splitStr[i] = splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1)  
   }
   return splitStr.join(' ')
}

function handlePathClick(event) {
  const elem = event.target
  elem.style.fill = ratingToColourMap[selected]
}

function showTooltip(tooltipText) {
  const tooltip = document.getElementById("tooltip")
  tooltip.innerText = tooltipText
  tooltip.style.transition = ''
  tooltip.style.opacity = '1'
}

function hideTooltip() {
  const tooltip = document.getElementById("tooltip")
  tooltip.style.transition = '0.5s linear 0.5s'
  tooltip.style.opacity = '0'
}

function updateSelected(value) {
  selected = value
  var elements = document.getElementsByClassName("selected")
  for (var elem of elements) {
      elem.className = ''
  }
  var selectedElem = document.getElementById(value)
  selectedElem.classList.add("selected")
}

function showHelpModal() {
  const container = document.getElementsByClassName("modal-container").item(0)
  container.style.display = 'block'

  const closeButton = document.getElementsByClassName("close-modal").item(0)

  closeButton.onclick = function() {
    container.style.display = 'none'
    window.onclick = null
  }

  window.onclick = function(event) {
    if (event.target == container) {
      container.style.display = 'none'
      window.onclick = null
    }
  }
}

function goToTextTool() {
  document.location.href = "https://hindley.me/interactive-electorate-ratings/"
}

function onChooseFile(event) {
  const files = event.target?.files

  if (!files || typeof window.FileReader !== 'function') {
    alert("Sorry, your browser does not support this functionality.")
    console.error("Sorry, your browser does not support this functionality.")
    const elem = document.getElementById("import-ratings")
    elem.className = "button disabled"
    elem.onclick = null
  } else if (files[0]) {
    const fr = new FileReader()
    fr.onload = val => {
      loadRatings(JSON.parse(val.target.result))
    }
    fr.readAsText(files[0])
  } else {
    return undefined
  }

  // reset the file to null so the same file can be selected again
  document.getElementById("import-json").value = null
}

const rgbToHex = (r, g, b) => {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('')
}

function loadRatings(ratings) {

  var pathElems = document.querySelectorAll("path")
  backupRatings = {}
  
  for (var pathElem of pathElems) {
    const id = pathElem.getAttribute('inkscape:label')
    if (id !== null) {
      const rgb = pathElem.style.fill.slice(4, pathElem.style.fill.length - 1).split(', ')
      backupRatings[id] = colourToRatingMap[rgbToHex(parseInt(rgb[0]), parseInt(rgb[1]), parseInt(rgb[2]))]
    }
  }

  for (var pathElem of pathElems) {
    const id = pathElem.getAttribute('inkscape:label')
    if (id !== null) {
      if (!ratings[id]) {
        alert(`Electorate with id "${id}" missing from JSON file.`)
        console.error(`Electorate with id "${id}" missing from JSON file.`)
        loadRatings(backupRatings)
        return
      } else if (!Object.keys(ratingToColourMap).includes(ratings[id])) {
        alert(`Invalid rating "${ratings[id]}" for electorate with id "${id}".\n\nThe valid ratings are "close-race", "nat", "lab", "act", "grn", "tpm", "nzf", and "top".`)
        console.error(`Invalid rating "${ratings[id]}" for electorate with id "${id}".\n\nThe valid ratings are "close-race", "nat", "lab", "act", "grn", "tpm", "nzf", and "top".`)
        loadRatings(backupRatings)
        return
      } else {
        pathElem.style.fill = ratingToColourMap[ratings[id]]
      }
    }
  }
}

function importJson() {
  document.getElementById("import-json").click()
}

function exportJson() {
  // TODO sort this
  var pathElems = document.querySelectorAll("path")
  var json = {}

  for (var pathElem of pathElems) {
    const id = pathElem.getAttribute('inkscape:label')
    if (id !== null) {
      const rgb = pathElem.style.fill.slice(4, pathElem.style.fill.length - 1).split(', ')
      json[id] = colourToRatingMap[rgbToHex(parseInt(rgb[0]), parseInt(rgb[1]), parseInt(rgb[2]))]
    }
  }

  const dict = JSON.stringify(json)
  const blob = new Blob([dict], { type: "application/json"})
  const url = window.URL.createObjectURL(blob)

  const a = document.createElement("a")
  a.href = url
  a.download = "electorate-ratings.json"
  a.click()
}

function capture() {
  var element = document.getElementById("to-export")
  element.style.width = '1500px'
  html2canvas(element, {backgroundColor: '#EEE', height: 1220, width: 1500, scale: 4}).then(canvas => {
      canvas.toDataURL('image/png')
      var a = document.createElement("a")
      a.href = canvas.toDataURL("image/png")
      a.download = "electorate-ratings.png"
      a.click()
  })
  element.style.width = 'auto'
}
