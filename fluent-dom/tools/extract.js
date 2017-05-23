const program = require('commander');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const fluent = require('fluent-syntax');

const defaultLocale = 'en-US';

let readFilePro = function(filename){
  return new Promise(function(resolve, reject) {
    fs.readFile(filename, (err, data) => {
      if(err) reject(err);
      resolve(data.toString())
    })
  })
}

program
  .version('0.0.1')
  .usage('[options] [html]')
  .parse(process.argv);

if (program.args.length < 1) {
  console.log("Need at least one argument");
} else {
  parseHTML(program.args[0])
    .then(buildFTLContext)
    .then(analyzeContext)
    .then(syncContext);
}

function parseHTML(htmlFilePath) {
  const basePath = path.dirname(htmlFilePath);

  return readFilePro(htmlFilePath).then(html => {
    const dom = new JSDOM(html);
    const { document } = (new JSDOM(html)).window;
    
    const resIds = Array.from(
      document.querySelectorAll('link[rel="localization"]'))
        .map(el => el.getAttribute('href'));

    const l10nNodes = Array.from(
      document.querySelectorAll('[data-l10n-id]')
    );
    return {
      basePath,
      resIds,
      l10nNodes
    };
  });
}

function buildFTLContext(htmlData) {
  const filePaths = htmlData.resIds.map(
    resId => path.join(
      htmlData.basePath,
      resId.replace('{locale}', defaultLocale)
    )
  );
  const fileReads = filePaths.map(p => readFilePro(p));
  
  return Promise.all(fileReads).then(files => {
    let ctx = {
      files: filePaths,
      msgs: {}
    }; 
    files.forEach(file => {
      let ftlResource = loadFTL(file);
      ftlResource.body.forEach(entry => {
        if (entry.type === 'Message') {
          ctx.msgs[entry.id.name] = entry;
        }
      })
    })
    return {
      ftlContext: ctx,
      htmlData
    };
  });
}

function analyzeContext({ ftlContext, htmlData }) {
  const report = [];

  for (l10nId in ftlContext.msgs) {
    if (!l10nIdInNodeList(l10nId, htmlData.l10nNodes)) {
      report.push({
        type: 'obsolete',
        id: l10nId
      });
    }
  }

  for (l10nNode of htmlData.l10nNodes) {
    const l10nId = l10nNode.getAttribute('data-l10n-id');
    if (!ftlContext.msgs.hasOwnProperty(l10nId)) {
      report.push({
        type: 'missing',
        id: l10nId,
        msg: extractMessageFromNode(l10nNode)
      });
    }
  }

  return {
    htmlData,
    ftlContext,
    report
  }
}

function syncContext({ htmlData, ftlContext, report }) {
  const actions = [];

  for (const item of report) {
    switch (item.type) {
      case 'obsolete':
        console.warn(`${item.id} is not used in the HTML.`);
        break;
      case 'missing':
        console.warn(`${item.id} is missing from the context.`);
        actions.push(addToFTL(ftlContext.files, item.msg));
        break;
    }
  }
  return Promise.all(actions);
} 

function extractMessageFromNode(node) {
  const msg = new fluent.Message();
  const id = new fluent.Identifier(node.getAttribute('data-l10n-id'));
  const value = new fluent.Pattern([
    new fluent.TextElement(node.textContent)
  ]);
  msg.id = id;
  msg.value = value;
  // let attrs = node.getAttributeNames().filter(attrName => {
  //   return attrName != 'data-l10n-id';
  // }).map(attrName => {
  //   return node.getAttribute(attrName);
  // });

  return msg;
}

function l10nIdInNodeList(l10nId, nodeList) {
  for (const node of nodeList) {
    if (node.getAttribute('data-l10n-id') === l10nId) {
      return true;
    }
  }
  return false;
}

function loadFTL(source) {
  let ftlAST = fluent.parse(source);
  return ftlAST;
}

function addToFTL(filePaths, msg) {
  let filePath;

  if (filePaths.length === 1) {
    filePath = filePaths[0]; 
  } else {
    console.log(`Which FTL file ${msg.id.name} should be added to:`)
    console.log(filePaths);
    filePath = filePaths[0];
  }
  return readFilePro(filePath).then(source => {
    let ftlAST = fluent.parse(source);
    ftlAST.body.push(msg);
    let string = fluent.serialize(ftlAST);
    //console.log(string);
  })
}

function updateInFTL(filePath, msg) {
  let filePath;

  if (filePaths.length === 1) {
    filePath = filePaths[0]; 
  } else {
    console.log(`Which FTL file ${msg.id.name} should be added to:`)
    console.log(filePaths);
    filePath = filePaths[0];
  }
  return readFilePro(filePath).then(source => {
    let ftlAST = fluent.parse(source);
    ftlAST.body.push(msg);
    let string = fluent.serialize(ftlAST);
    console.log(string);
  })
}
