const path = require("path");
const fs = require("fs");

function walker(mdDir) {
  if (!fs.existsSync(mdDir)) {
    return [];
  }
  let folders = [];
  let files = [];

  pathDir = fs.readdirSync(mdDir);
  pathNext = pathDir.map((p) => path.join(mdDir, p));
  pathNext.forEach((p) => {
    stat = fs.statSync(p);
    if (stat.isDirectory()) {
      folders.push(p);
    } else if (p.endsWith(".md")) {
      files.push(p);
    }
  });
  folders.forEach((p) => files.push(...walker(p)));
  return files;
}

// 找到 Obsidian json 配置文件
function getObsidianJson() {
  username = process.env["USERPROFILE"].split(path.sep)[2];
  config =
    "C:\\Users\\Administrator\\AppData\\Roaming\\obsidian\\obsidian.json";
  configUser =
    "C:\\Users\\" + username + "\\AppData\\Roaming\\obsidian\\obsidian.json";
  if (fs.existsSync(configUser)) {
    return configUser;
  } else if (fs.existsSync(config)) {
    return config;
  }
}

function getObsidianItems() {
  // 获取配置 JSON
  configPath = getObsidianJson();
  const configData = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  // 获取笔记库 ID 和笔记库路径
  if (!configData) return;
  const vaults = configData["vaults"];
  const vaultsIDPath = Object.keys(vaults).map((key) => {
    vaultsPath = vaults[key]["path"];
    return { id: key, path: vaultsPath };
  });
  // 获取每个笔记的路径和所在笔记库 ID
  const items = [];
  vaultsIDPath.map((v) => {
    mdPaths = walker(v["path"]);
    mdPaths.map((mdPath) => {
      items.push({
        vualtid: v["id"],
        mdpath: mdPath,
      });
    });
  });
  // 获取每个笔记的标题、内容
  items.map((item) => {
    mdTitle = path.basename(item["mdpath"]).slice(0, -3);
    mdContent = fs.readFileSync(item["mdpath"], "utf-8");
    item["mdtitle"] = mdTitle;
    item["mdcontent"] = mdContent;
  });

  return items;
}

function searchObsidianItems(searchWord, items) {
  const regexText = searchWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // 'i'不区分大小写进行检索
  const searchRegex = new RegExp(regexText, "i");
  searchItems = items.filter(
    (item) =>
      item.mdtitle.search(searchRegex) !== -1 ||
      item.mdcontent.search(searchRegex) !== -1
  );
  const callbackItems = [];
  searchItems.map((item) => {
    callbackItems.push({
      title: item.mdtitle,
      description: item.mdcontent,
      icon: "logo.png",
      url: `obsidian://open?vault=${item.vualtid}&file=${item.mdtitle}`,
    });
  });
  return callbackItems;
}

// 搜索功能
window.exports = {
  "obsidian-search": {
    mode: "list",
    args: {
      enter: (action, callbackSetList) => {
        mdItems = getObsidianItems();
        // console.log(callbackItems);
      },
      search: (action, searchWord, callbackSetList) => {
        if (!searchWord) return callbackSetList();
        callbackItems = searchObsidianItems(searchWord, mdItems);
        // console.log(callbackItems);
        return callbackSetList(callbackItems);
      },
      select: (action, itemData) => {
        window.utools.hideMainWindow(false);
        console.log(itemData.url);
        utools.shellOpenExternal(itemData.url);
        window.utools.outPlugin();
      },
    },
  },
};
