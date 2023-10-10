var selected = 'close-race'
var listSeatsCalculated = false

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

var ratingMap = {
  // TODO maybe update with overhang seats
  "close-race": { electorateSeats: 0, color: "#767171" },
  "lab": { electorateSeats: 0, listSeats: 0, totalSeats: 0, color: "#d00a12", fullName: "Labour" },
  "nat": { electorateSeats: 0, listSeats: 0, totalSeats: 0, color: "#1e4882", fullName: "National" },
  "grn": { electorateSeats: 0, listSeats: 0, totalSeats: 0, color: "#0ca747", fullName: "Green" },
  "act": { electorateSeats: 0, listSeats: 0, totalSeats: 0, color: "#f3ca1e", fullName: "ACT" },
  "tpm": { electorateSeats: 0, listSeats: 0, totalSeats: 0, color: "#c37d23", fullName: "Te Pāti Māori" },
  "top": { electorateSeats: 0, listSeats: 0, totalSeats: 0, color: "#09B598", fullName: "TOP" },
  "nzf": { electorateSeats: 0, listSeats: 0, totalSeats: 0, color: "#000000", fullName: "NZ First" },
}

var colorToRatingMap = {
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
      const rating = colorToRatingMap[rgbToHex(pathElem.style.fill)]
      ratingMap[rating].electorateSeats += 1

      const tooltipText = specialNameMap[label] || formatLabel(label)
      pathElem.setAttribute('onclick', "handlePathClick(event)")
      pathElem.setAttribute('onmouseover', `showTooltip('${tooltipText}')`)
      pathElem.setAttribute('onmouseleave', "hideTooltip()")
    }
  }
  setupTable()
}

function setupTable() {
  const table = document.getElementById('table')
  table.replaceChildren()

  const orderedKeys = Object.keys(ratingMap)
    .filter(rating => ratingMap[rating].electorateSeats > 0 && rating !== "close-race")
    .sort((rating1, rating2) => ratingMap[rating2].electorateSeats - ratingMap[rating1].electorateSeats)
  orderedKeys.unshift('titles')

  for(let key of orderedKeys) {
    var line = document.createElement('div')
    line.className = 'line'
    table.appendChild(line)

    var div = document.createElement('div')
    div.className = `party ${key}`
    div.innerHTML = ratingMap[key]?.fullName || ""
    line.appendChild(div)

    div = document.createElement('div')
    div.className = `seats-${key}`
    div.innerHTML = key === 'titles' ? "Electorate Seats" : ratingMap[key].electorateSeats
    line.appendChild(div)

    // div = document.createElement('div')
    // div.className = `seats-${key}`
    // div.innerHTML = key === 'titles' ? "List Seats" : ratingMap[key].listSeats
    // line.appendChild(div)

    // div = document.createElement('div')
    // div.className = `seats-${key}`
    // div.innerHTML = key === 'titles' ? "Total Seats" : ratingMap[key].totalSeats
    // line.appendChild(div)
  }
}

function formatLabel(label) {
  var splitStr = label.toLowerCase().split('-')
   for (var i = 0; i < splitStr.length; i++) {
      splitStr[i] = splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1)  
   }
   return splitStr.join(' ')
}

function seatCalculator() {
  let quotients = {
    act: { fullPercent: 10, dividedPercent: 10, divisor: 1 },
    lab: { fullPercent: 28, dividedPercent: 28, divisor: 1 },
    grn: { fullPercent: 15, dividedPercent: 15, divisor: 1 },
    tpm: { fullPercent: 3.01, dividedPercent: 3.01, divisor: 1 },
    nzf: { fullPercent: 6.02, dividedPercent: 6.02, divisor: 1 },
    nat: { fullPercent: 35, dividedPercent: 35, divisor: 1 },
  }

  Object.keys(quotients)
    .filter(party => quotients[party].fullPercent < 5 && ratingMap[party].electorateSeats == 0)
    .forEach(party => delete quotients[party])

  const seats = {}
  Object.keys(quotients).map(party => seats[party] = 0)

  for(let i = 0; i < 120; i++) {
    const party = Object.keys(quotients)
      .map(party => { return { name: party, percent: quotients[party].dividedPercent }})
      .reduce((maxParty, party) => maxParty.percent < party.percent ? party : maxParty, { name: undefined, percent: 0 })

    seats[party.name] += 1
    quotients[party.name].divisor += 2
    quotients[party.name].dividedPercent = quotients[party.name].fullPercent / quotients[party.name].divisor
  }

  Object.keys(seats).forEach(party => {
    ratingMap[party].totalSeats = Math.max(seats[party], ratingMap[party].electorateSeats)
    ratingMap[party].listSeats = ratingMap[party].totalSeats - ratingMap[party].electorateSeats
  })

  listSeatsCalculated = true
}

function handlePathClick(event) {
  const elem = event.target
  const oldRating = colorToRatingMap[rgbToHex(elem.style.fill)]
  elem.style.fill = ratingMap[selected].color

  ratingMap[oldRating].electorateSeats -= 1
  ratingMap[selected].electorateSeats += 1
  // Only update the listSeats if they have previously been calculated
  if (listSeatsCalculated) {
    ratingMap[oldRating].listSeats += 1
    if (ratingMap[selected].listSeats === 0) {
      // Overhang seat
      ratingMap[selected].totalSeats += 1
    } else {
      ratingMap[selected].listSeats -= 1
    }
  }

  setupTable()
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

const rgbToHex = (fullRgbString) => {
  const rgb = fullRgbString.slice(4, fullRgbString.length - 1).split(', ')
  return '#' + rgb.map(x => {
    const hex = parseInt(x).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('')
}

function loadRatings(ratings) {

  var pathElems = document.querySelectorAll("path")
  backupRatings = {}
  
  for (var pathElem of pathElems) {
    const id = pathElem.getAttribute('inkscape:label')
    if (id !== null) {
      backupRatings[id] = colorToRatingMap[rgbToHex(pathElem.style.fill)]
    }
  }

  Object.keys(ratingMap).forEach(key => {
    ratingMap[key].electorateSeats = 0
    ratingMap[key].listSeats = 0
    ratingMap[key].totalSeats = 0
    // TODO this shouldn't remove list and total seats
  })

  for (var pathElem of pathElems) {
    const id = pathElem.getAttribute('inkscape:label')
    if (id !== null) {
      if (!ratings[id]) {
        alert(`Electorate with id "${id}" missing from JSON file.`)
        console.error(`Electorate with id "${id}" missing from JSON file.`)
        loadRatings(backupRatings)
        return
      } else if (!Object.keys(ratingMap).includes(ratings[id])) {
        alert(`Invalid rating "${ratings[id]}" for electorate with id "${id}".\n\nThe valid ratings are "close-race", "nat", "lab", "act", "grn", "tpm", "nzf", and "top".`)
        console.error(`Invalid rating "${ratings[id]}" for electorate with id "${id}".\n\nThe valid ratings are "close-race", "nat", "lab", "act", "grn", "tpm", "nzf", and "top".`)
        loadRatings(backupRatings)
        return
      } else {
        pathElem.style.fill = ratingMap[ratings[id]].color
        ratingMap[ratings[id]].electorateSeats += 1
        // TODO need to handle list seats and total seats
      }
    }
  }
  setupTable()
}

function importJson() {
  document.getElementById("import-json").click()
}

function exportJson() {
  var pathElems = document.querySelectorAll("path")
  var json = {}

  for (var pathElem of pathElems) {
    const id = pathElem.getAttribute('inkscape:label')
    if (id !== null) {
      json[id] = colorToRatingMap[rgbToHex(pathElem.style.fill)]
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
  var table = document.getElementById('table')
  element.style.width = '1500px'
  table.style.left = '1200px'
  html2canvas(element, {backgroundColor: '#EEE', height: 1230, width: 1500, scale: 4}).then(canvas => {
      canvas.toDataURL('image/png')
      var a = document.createElement("a")
      a.href = canvas.toDataURL("image/png")
      a.download = "electorate-ratings.png"
      a.click()
  })
  element.style.width = 'auto'
  table.style.left = 'calc(15% + 1100px)'
}
