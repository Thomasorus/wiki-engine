import * as fs from 'fs'
import * as utils from './utils.mjs'
import {
  config
} from './config.mjs'
import textParser from './kaku.mjs'
import timeParser from './time.mjs'


class Entry {
  constructor() {
    this.key
    this.date
    this.type
    this.title
    this.htmlTitle
    this.titleSlug
    this.category
    this.categoryName
    this.categorySlug
    this.bref
    this.isPrivate
    this.body
    this.parsedText
    this.startWeek
    this.startYear
    this.endWeek
    this.endYear
    this.totalTime = 0
    this.activity = []
    this.project = []
    this.timeSection = ""
    this.children = []
  }
}

async function generate(config) {

  utils.mkDir(config.buildDir)
  utils.mkDir(config.buildAssetsDir)
  utils.mkDir(config.buildMediaDir)

  utils.moveAssets(config.srcAssetsDir, config.buildAssetsDir)

  const contentArray = utils
    .readFile(config.srcDataDir + '/' + config.contentFile)
    .split(config.contentSplitter)
  const timeArray = utils
    .readFile(config.srcDataDir + '/' + config.timeFile)
    .split('\n')
  const rssArray = []
  const sitemapArray = []

  const xmlString = utils.readFile(`${config.buildDir}/feed.xml`)
  const splitString = xmlString.replace(/\n/g, "").split("</image><item>")
  const feedArray = splitString[1].split("</item><item>")

  const htmlTemplate = utils.readFile(`${config.srcAssetsDir}/${config.htmlTemplate}`)
  const rssItemTemplate = utils.readFile(config.srcAssetsDir + '/' + config.itemTemplate)
  const rssTemplate = utils.readFile(config.srcAssetsDir + '/' + config.rssTemplate)

  const allEntries = []

  // Creating all pages from content file
  for (let i = 0; i < contentArray.length; i++) {
    const el = contentArray[i]
    if (el !== '') {
      const entry = new Entry()

      let name = el.match(/(?:NAME:)((?:\\[\s\S]|[^\\])+?)\n/g)
      entry.title = name[0].substr(5).trim()
      entry.key = entry.title.toLowerCase().replace(/\b \b/g, '_')
      entry.htmlTitle = entry.title + ' | Thomasorus'
      entry.titleSlug = entry.title.toLowerCase().replace(/\b \b/g, '-')

      let category = el.match(/(?:HOST:)((?:\\[\s\S]|[^\\])+?)\n/g)
      entry.category = category[0].substr(5).trim()
      if (entry.category !== "") {
        entry.categoryName = entry.category.charAt(0).toUpperCase() + entry.category.slice(1)
        entry.categorySlug = entry.category.toLowerCase().replace(/\b \b/g, '-')
      }

      let bref = el.match(/(?:BREF:)((?:\\[\s\S]|[^\\])+?)\n/g)
      entry.bref = bref[0].substr(5).trim()

      let isPrivate = el.match(/(?:PRIV:)((?:\\[\s\S]|[^\\])+?)\n/g)
      entry.isPrivate = isPrivate[0].substr(5).trim()

      let body = el.match(/(?:BODY:)((?:\\[\s\S]|[^\\])+?)$/g)
      entry.body = body[0].substr(5).trim()
      entry.parsedText = textParser(entry.body)

      entry.type = 'content'
      allEntries.push(entry)
    }
  }

  //Creating time pages from time file
  for (let i = 0; i < timeArray.length; i++) {
    const timeEl = timeArray[i].split(' ')

    //Checking if time and content can be linked
    for (let u = 0; u < allEntries.length; u++) {
      const contentEl = allEntries[u]

      // Check either in content or project
      if (contentEl.key === timeEl[3].toLowerCase() || contentEl.key === timeEl[2].toLowerCase()) {
        if (contentEl.key === timeEl[3].toLowerCase()) {
          if (!contentEl.startYear) {
            contentEl.startYear = timeEl[0]
            contentEl.startWeek = timeEl[1]
          }
          if (contentEl.startYear) {
            contentEl.endYear = timeEl[0]
            contentEl.endWeek = timeEl[1]
          }
          if (!contentEl.activity.includes(timeEl[2].replace(/_/g, " "))) {
            contentEl.activity.push(timeEl[2].replace(/_/g, " "))
          }
          if (!contentEl.project.includes(timeEl[3].replace(/_/g, " "))) {
            contentEl.project.push(timeEl[3].replace(/_/g, " "))
          }
          if (timeEl[4]) {
            contentEl.totalTime += Number(timeEl[4])
          }
          timeEl.project = true
        }

        if (contentEl.key === timeEl[2].toLowerCase()) {
          if (!contentEl.startYear) {
            contentEl.startYear = timeEl[0]
            contentEl.startWeek = timeEl[1]
          }
          if (contentEl.startYear) {
            contentEl.endYear = timeEl[0]
            contentEl.endWeek = timeEl[1]
          }
          if (!contentEl.activity.includes(timeEl[2].replace(/_/g, " "))) {
            contentEl.activity.push(timeEl[2].replace(/_/g, " "))
          }
          if (!contentEl.project.includes(timeEl[3].replace(/_/g, " "))) {
            contentEl.project.push(timeEl[3].replace(/_/g, " "))
          }
          if (timeEl[4]) {
            contentEl.totalTime += Number(timeEl[4])
          }
          timeEl.activity = true
        }
      }
    }

    // Create pages without content
    if (!timeEl.project) {
      const project = new Entry()
      project.key = timeEl[3].toLowerCase()
      if (!project.startYear) {
        project.startYear = timeEl[0]
        project.startWeek = timeEl[1]
      }
      if (project.startYear) {
        project.endYear = timeEl[0]
        project.endWeek = timeEl[1]
      }
      if (!project.activity.includes(timeEl[2])) {
        project.activity.push(timeEl[2].replace(/_/g, " "))
      }
      if (!project.project.includes(timeEl[3].replace(/_/g, " "))) {
        project.project.push(timeEl[3].replace(/_/g, " "))
        project.timeSlug = timeEl[3].toLowerCase().replace(/_/g, "-").replace(/\b \b/g, '')
      }
      if (!project.category) {
        project.category = "time"
        project.categoryName = "Time"
        project.categorySlug = "time"
      }
      if (timeEl[4]) {
        project.totalTime += Number(timeEl[4])
      }
      project.type = 'project'
      allEntries.push(project)
    }

    if (!timeEl.activity) {
      const activity = new Entry()
      activity.key = timeEl[2].toLowerCase()
      if (!activity.startYear) {
        activity.startYear = timeEl[0]
        activity.startWeek = timeEl[1]
      }
      if (activity.startYear) {
        activity.endYear = timeEl[0]
        activity.endWeek = timeEl[1]
      }
      if (!activity.activity.includes(timeEl[2])) {
        activity.activity.push(timeEl[2].replace(/_/g, " "))
        activity.timeSlug = timeEl[2].toLowerCase().replace(/_/g, "-").replace(/\b \b/g, '')
      }
      if (!activity.project.includes(timeEl[3].replace(/_/g, " "))) {
        activity.project.push(timeEl[3].replace(/_/g, " "))
      }
      if (!activity.category) {
        activity.category = "time"
        activity.categoryName = "Time"
        activity.categorySlug = "time"
      }
      if (timeEl[4]) {
        activity.totalTime += Number(timeEl[4])
      }
      activity.type = 'activity'
      allEntries.push(activity)
    }
  }

  //Parsing time
  const timeText = await timeParser(utils.readFile(config.srcDataDir + '/' + config.timeFile))
  allEntries.forEach(function (el) {
    if (el.titleSlug === "time")
      el.parsedText = timeText
  })

  for (let i = 0; i < allEntries.length; i++) {
    const el = allEntries[i];

    // if (el.rssItem !== undefined) {
    //   rssArray.push(el.rssItem)
    // }
    if (el.titleSlug !== el.categorySlug && el.category !== null && el.category !== "") {
      el.hostNav = `<nav role="breadcrumb"><i>Back to <a href="${el.categorySlug}.html">${el.categoryName}</a></i></nav>`
    }

    // TODO > REFACTOR THIS
    if (!el.titleSlug) {
      el.hostNav = `<nav role="breadcrumb"><i>Back to <a href="${el.categorySlug}.html">${el.categoryName}</a></i></nav>`
      if (el.type === "project") {
        console.log(` -> Time entry ${el.project} has no content.`)
        el.parsedText = `<h1>${el.project}</h1><p><p>This page presents statictics related to the ${el.project} project and was automatically generated by the time tracker.</p>`
        if (el.activity.length > 0 && el.activity[0] !== "null") {
          el.parsedText += `<p>This project is part of these activities:</p><ul>`
          el.activity.forEach(function (ac) {
            el.parsedText += `<li><a href="${ac.toLowerCase().replace(/\b \b/g, '-')}.html">${ac}</a></li>`
          })
          el.parsedText += `</ul>`
        } else {
          el.parsedText += `<p>This project is part of the <a href="${el.activity[0].toLowerCase().replace(/\b \b/g, '-')}.html">${el.activity[0]}</a> activity.</p>`
        }
      }
      if (el.type === "activity") {
        console.log(` -> Time entry ${el.activity} has no content.`)
        el.parsedText = `<h1>${el.activity}</h1><p>This page presents statictics related to the ${el.activity} activities and was automatically generated by the time tracker.</p>`
        if (el.project.length > 0 && el.project[0] !== "null") {
          el.parsedText += `<p>Projects related to this activity:</p><ul>`
          el.project.forEach(function (pr) {
            el.parsedText += `<li><a href="${pr.toLowerCase().replace(/\b \b/g, '-')}.html">${pr}</a></li>`
          })
          el.parsedText += `</ul>`
        } else {
          el.parsedText += `<p>The <a href="${el.activity[0].toLowerCase().replace(/\b \b/g, '-')}.html">${el.activity[0]}</a> project is part of this activity.</p>`
        }
      }
    }
  }

  //Checking for differences between xml and new content
  for (let i = 0; i < allEntries.length; i++) {
    const el = allEntries[i];
    
    if(el.type === "content") {
      for (let i = 0; i < feedArray.length; i++) {
        const feedEl = feedArray[i];

        const guidRegex = RegExp(`<guid isPermaLink="false">${el.titleSlug}</guid>`, 'g');
        const match = guidRegex.test(feedEl)
        
        if(match) {
          const date = await utils.parseXml("pubDate", feedEl)

          const content = await utils.parseXml("description", feedEl)
          const cleanedContent = content.replace(/]]>/g, "").replace(/<!\[CDATA\[/g, "")
          const trimedContent = cleanedContent.replace(/\n/g, "").replace(/\s/g, "")

          const trimedParsedText = el.parsedText.replace(/\n/g, "").replace(/\s/g, "")

          const lol1 = trimedParsedText.length
          const lol2 = trimedContent.length

          if(trimedContent === trimedParsedText) {
            el.date = date
          } else {
            const today = new Date;
            el.date = today.toUTCString()
          }
        }
      }
      if(el.date === undefined) {
        const today = new Date;
        el.date = today.toUTCString()
      }
    } else if(el.date === undefined) {
      const today = new Date;
      el.date = today.toUTCString()
    }
  }

  for (let i = 0; i < allEntries.length; i++) {
    const el = allEntries[i];

    let timeSectionTitle = ""
    if (el.type === "project") {
      timeSectionTitle = el.project
    } else if (el.type === "activity") {
      timeSectionTitle = el.activity
    } else {
      timeSectionTitle = el.title
    }

    if (timeSectionTitle.length >= 20) {
      timeSectionTitle = el.title.slice(0, 20) + "..."
    }

    if (el.totalTime > 0) {
      el.timeSection = `
      <section role="complementary">
        <details>
          <summary class="time-row">
              <span class="time-row__title">${timeSectionTitle}</span>
              <span> Last edit
                  <span aria-hidden="true">→</span>
                  <time>${el.date}</time>
              </span>
          </summary>
          <dl class="time-row-more">
              <dt>
                  Time spent
                  <span aria-hidden="true">→</span>
              </dt>
              <dd>${el.totalTime} hours total</dd>
              <dt>
                  Started
                  <span aria-hidden="true">→</span>
              </dt>
              <dd>Week ${el.startWeek} of ${el.startYear}</dd>
              <dt>
                  Last update
                  <span aria-hidden="true">→</span>
              </dt>
              <dd>Week ${el.endWeek} of ${el.endYear}</dd>
              </dl>
        </details>
      </section>
      `
    } else {
      el.timeSection = `
      <section role="complementary">
        <div>
          <div class="time-row">
              <span class="time-row__title">${timeSectionTitle}</span>
              <span> Last edit
                  <span aria-hidden="true">→</span>
                  <time>${el.date ? el.date : "No date"}</time>
              </span>
          </div>
         
        </div>
      </section>`
    }
  }

  for (let i = 0; i < allEntries.length; i++) {
    const el = allEntries[i];
    if (el.isPrivate === 'false') {
      let template = rssItemTemplate
      template = template.replace(/{{TITLE}}/g, el.title + " - Thomasorus")
      template = template.replace(/{{GUID}}/g, el.titleSlug)
      template = template.replace(/{{DATE}}/g, el.date)
      template = template.replace(/{{CONTENT}}/g, el.parsedText)
      el.rssItem = template
    }
    rssArray.push(el.rssItem)
  }

  //Turning the flat array to a tree
  const tree = await utils.toTree(allEntries)

  //Setting main category for each entry
  const finalTree = await utils.setMainCategories(tree)

  //Create html pages from tree (recursive function)
  generateHtml(finalTree)

  function generateHtml(arr) {
    // Generate pages
    for (var i = 0; i < arr.length; i++) {
      const el = arr[i]

      let page = htmlTemplate

      if (el.titleSlug === "time") {
        page = page.replace('<article>', "<article class='full'>")
      }

      if (el.titleSlug === "sitemap") {
        el.parsedText += utils.createRecursiveList(tree)
      }

      page = page.replace(/pageTitle/g, `${el.title ? el.title : el.project} - Thomasorus`)
      page = page.replace(/metaDescription/g, el.bref ? el.bref : "")
      page = page.replace(/breadCrumb/g, el.hostNav ? el.hostNav : "")
      page = page.replace(/timeSection/g, el.timeSection ? el.timeSection : "")
      page = page.replace(/pageBody/g, el.parsedText ? el.parsedText : "")
      page = page.replace(/colorCat/g, el.mainCategory ? el.mainCategory : "")

      utils.createFile(`${config.buildDir}/${el.titleSlug ? el.titleSlug : el.timeSlug}.html`, page)

      if (el.children.length > 0) {
        generateHtml(el.children)
      }
    }

  }

  

  // Generate RSS
  const itemsString = rssArray.join('\n')
  const event = new Date()
  const rssFile = rssTemplate
    .replace(/{{CONTENT}}/, itemsString)
    .replace(/{{DATE}}/, event.toUTCString())

  const currentRss = utils.readFile(`${config.buildDir}/feed.xml`)
  const rssContentPattern = '<\\/image>([\\s\\S]*?)<\\/channel>'
  const rssContent = RegExp(rssContentPattern).exec(currentRss)
  const rssHasChanged =
    rssContent[1].replace(/\n/g, '').trim() !==
    itemsString.replace(/\n/g, '').trim()

  if (rssHasChanged) {
    console.log('Updating RSS file')
    fs.writeFileSync(`${config.buildDir}/feed.xml`, rssFile, (err) => {
      if (err) {
        console.log(err)
        throw err
      }
    })
  } else {
    console.log('Skipping RSS file')
  }

}


generate(config)