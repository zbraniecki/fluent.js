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
    .then(syncContext)
    .then(saveFTLs)
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
      files: {},
      msgs: {}
    }; 
    files.forEach((file, i) => {
      let ftlResource = loadFTL(file);
      ftlResource.body.forEach(entry => {
        if (entry.type === 'Message') {
          ctx.msgs[entry.id.name] = {
            filePath: filePaths[i],
            entry
          };
        }
      });
      ctx.files[filePaths[i]] = ftlResource;
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
    const node = l10nIdInNodeList(l10nId, htmlData.l10nNodes);
    if (node === undefined) {
      report.push({
        type: 'obsolete',
        id: l10nId
      });
    } else {
      const msgFromNode = extractMessageFromNode(node);
      if (!msgsEqual(
        ftlContext.msgs[l10nId].entry,
        msgFromNode)) {
        report.push({
          type: 'changed',
          id: l10nId,
          entry: msgFromNode,
        })
      }
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
  for (const item of report) {
    switch (item.type) {
      case 'obsolete':
        console.warn(`${item.id} is not used in the HTML.`);
        removeFromFTL(ftlContext, item.id);
        break;
      case 'missing':
        console.warn(`${item.id} is missing from the context.`);
        addToFTL(ftlContext.files, item.msg);
        break;
      case 'changed':
        console.warn(`${item.id} has changed.`);
        updateInFTL(
          ftlContext,
          item.id,
          item.entry
        );
        break;
    }
  }
  return ftlContext;
} 

function saveFTLs(ftlContext) {
  console.log('\n\n=== Saving files ==\n\n');
  for (let filePath in ftlContext.files) {
    console.log(filePath);
    const str = fluent.serialize(ftlContext.files[filePath]);
    console.log(str)
    //write_file(filePath, str);
  }
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
      return node;
    }
  }
}

function loadFTL(source) {
  let ftlAST = fluent.parse(source);
  return ftlAST;
}

function addToFTL(files, msg) {
  let filePath;

  const filePaths = Object.keys(files);
  if (filePaths.length === 1) {
    filePath = filePaths[0]; 
  } else {
    console.log(`Which FTL file ${msg.id.name} should be added to:`)
    console.log(filePaths);
    filePath = filePaths[0];
  }
  files[filePath].body.push(msg);
}

function updateInFTL(ftlContext, l10nId, newMsg) {
  let ftlAST = ftlContext.files[ftlContext.msgs[l10nId].filePath];

  for (let i in ftlAST.body) {
    let entry = ftlAST.body[i];
    if (entry.id.name === l10nId) {
      ftlAST.body[i] = newMsg;
    }
  }
}

function removeFromFTL(ftlContext, l10nId) {
  let ftlAST = ftlContext.files[ftlContext.msgs[l10nId].filePath];

  for (let i in ftlAST.body) {
    let entry = ftlAST.body[i];
    if (entry.id.name === l10nId) {
      ftlAST.body.splice(i, 1);
    }
  }
}

function msgsEqual(msg1, msg2) {
  if (msg1.type !== msg2.type) {
    return false;
  }

  if (msg1.id.name !== msg2.id.name) {
    return false;
  }

  if (msg1.value.elements[0] !== msg2.value.elements[0]) {
    return false;
  }
  return true;
}
