import 'purecss/build/pure-min.css'
import 'purecss/build/grids-responsive-min.css'

import './style.css'

const papa = require('papaparse');

const CSV = 'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_global.csv'

const HSLToRGB = (h: number, s: number, l: number) => {
  s /= 100
  l /= 100

  let c = (1 - Math.abs(2 * l - 1)) * s
  let x = c * (1 - Math.abs((h / 60) % 2 - 1))
  let m = l - c/2
  let r = 0
  let  g = 0
  let b = 0

  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }

  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);
    
  return `rgb(${r}, ${g}, ${b})`
}

const aggregateData = (array : string[][]) => {
  const countries : Map<string, number[]> = new Map

  array.forEach(line => {
    const name = line[1]
    const values = line.slice(4)
    const country = countries.get(name) || new Array(values.length).fill(0)

    if (name) countries.set(name, country?.map((value, idx) => value + parseInt(values[idx])))
  })

  return countries
}

const orderByTotal = (countries: Map<string, number[]>) => {
  return new Map(Array.from(countries.entries()).sort((a : [string, number[]], b : [string, number[]]) => b[1][b[1].length - 1] - a[1][a[1].length - 1]))  
}

const calculateDaily = (total: Map<string, number[]>) => {
  if (!(document.location.href.endsWith('?growth') || document.location.href.endsWith('?daily'))) return total

  const daily : Map<string, number[]> = new Map

  Array.from(total.keys()).forEach(country => {
    const values = total.get(country) || []
    daily.set(country, values.map((value, idx) => idx == 0 ? 0 : value - values[idx - 1]))
  })

  return daily
}

const calculateGrowth = (daily: Map<string, number[]>) => {
  if (!document.location.href.endsWith('?growth')) return daily

  const growth : Map<string, number[]> = new Map

  Array.from(daily.keys()).forEach(country => {
    const values = daily.get(country) || []
    let total = 0
    growth.set(country, values.map((value) => {
      const last = total
      total += value
      return last == 0 ? 0 : value / last
    }))
  })

  return growth
}

const calculateColors = (countries: Map<string, number[]>) => {
  const colors : Map<string, string[]> = new Map

  Array.from(countries.keys()).forEach(country => {
    const values = countries.get(country) || []
    const max = Math.max(...values)
    colors.set(country, values.map(value => HSLToRGB(200, 100, 25 + (value / max) * 35)))
  })

  return colors
}

const createBar = (country: string, values: string[]) => {
  const section = document.querySelector('#countries')

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  svg.setAttribute('width', '100%')
  svg.setAttribute('height', '100%')
  svg.setAttribute('viewBox', '0 0 1000 30')
  svg.setAttribute('preserveAspectRatio', 'xMaxYMid meet')
  section?.appendChild(svg)

  const g = document.createElementNS("http://www.w3.org/2000/svg", "g")
  g.classList.add('bars')
  svg.appendChild(g)

  values.forEach((value, idx) => {
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect")
    rect.setAttribute('fill', `${value}`)
    rect.setAttribute('x', `${Math.floor(idx * 1000 / values.length)}`)
    rect.setAttribute('width', `${Math.ceil(1000 / values.length) + 1}`)
    rect.setAttribute('height', '30')
    g.appendChild(rect)
  })

  const h2 = document.createElement('h2')
  h2.innerText = country
  section?.appendChild(h2)
}

const createBars = (countries : Map<string, string[]>) => {

  Array.from(countries.keys()).forEach(country => createBar(country, countries.get(country) || []))
}

const loadCSV = () => {
  fetch(CSV)
    .then(response => response.text())
    .then(csv => papa.parse(csv))
    .then(response => response.data)
    .then(array => array.slice(1))
    .then(aggregateData)
    .then(orderByTotal)
    .then(calculateDaily)
    .then(calculateGrowth)
    .then(calculateColors)
    .then(createBars)
}

loadCSV()