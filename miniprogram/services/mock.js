// mock.js - 数据层(正式版)
// ⚠️ 2026-08 按甲方要求清理:
//    - 移除全部内置演示商品(测试图), 商品只来自甲方手机上传
//    - 分类: 专区(gender+part) -> 组别(group) -> 小分组(subGroup, 可选)
//    - 商品模型: { id, name, gender, part, group, subGroup?,
//                  media: [{ type: 'image'|'video', url, poster? }] }
//    - 测试号阶段存本地持久目录; 云开发阶段存云存储
//    - 数据形状与云开发版保持一致, 页面代码零改动。
const config = require('../utils/config')

// 首页动态宣传图(正式版: 甲方提供的 1.jpg)
const BANNER_IMG = '/images/1.jpg'

// ---------------- 商家上传商品 -> 本地持久化存储 ----------------
const LOCAL_KEY = config.PRODUCTS_KEY

function loadLocal() {
  return wx.getStorageSync(LOCAL_KEY) || []
}

function saveLocal(list) {
  wx.setStorageSync(LOCAL_KEY, list)
}

// 商品补充派生字段: 封面图(列表/卡片用)
//   image -> url; video -> poster(视频封面)
function decorate(p) {
  const first = (p.media || [])[0] || {}
  return Object.assign({}, p, {
    cover: first.type === 'video' ? (first.poster || '') : (first.url || ''),
    isVideo: first.type === 'video'
  })
}

// 全部商品(仅甲方上传)
function allProducts() {
  return loadLocal().map(decorate)
}

// ---------------- 查询工具 ----------------
function matchFilter(p, filter = {}) {
  if (filter.gender && p.gender !== filter.gender) return false
  if (filter.part && p.part !== filter.part) return false
  if (filter.group && p.group !== filter.group) return false
  if (filter.subGroup && p.subGroup !== filter.subGroup) return false
  if (filter.keyword) {
    const kw = String(filter.keyword).trim().toLowerCase()
    if (kw && p.name.toLowerCase().indexOf(kw) === -1) return false
  }
  return true
}

// ---------------- 对外查询函数(全部 Promise, 模拟异步) ----------------
const delay = (ms = 80) => new Promise(r => setTimeout(r, ms))

// 首页: 动态宣传图(专区入口卡片由页面直接读 config, 无需接口)
async function getHomeData() {
  await delay()
  const banners = [
    { id: 'hb1', image: BANNER_IMG, title: '珠珠童装 欢迎选购' },
    { id: 'hb2', image: BANNER_IMG, title: '男女童专区 组别齐全' },
    { id: 'hb3', image: BANNER_IMG, title: '微信联系商家 便捷下单' }
  ]
  return { banners }
}

// 商品池列表: 按 专区(gender/part)/组别/关键词 过滤
// 分页: page 从 0 开始, 每页 pageSize 条(默认 20)
async function getProducts(filter = {}, page = 0, pageSize = 20) {
  await delay()
  const all = allProducts().filter(p => matchFilter(p, filter))
  const list = all.slice(page * pageSize, (page + 1) * pageSize)
  return { list }
}

// 商品详情
async function getProduct(id) {
  await delay()
  return allProducts().find(p => p.id === id) || null
}

// 搜索(商品名模糊匹配)
async function searchProducts(keyword) {
  await delay()
  const kw = String(keyword || '').trim().toLowerCase()
  if (!kw) return []
  return allProducts().filter(p => p.name.toLowerCase().indexOf(kw) !== -1)
}

// 商家已上传列表(全量, 含派生字段)
function getLocalProducts() {
  return allProducts()
}

// ---------------- 商家上传(本地版) ----------------
// p = { name, gender, part, group, media: [{type,url,poster?}] }
async function addProduct(p) {
  await delay()
  const product = Object.assign({}, p, {
    id: 'p' + Date.now(),
    createTime: Date.now()
  })
  const list = loadLocal()
  list.unshift(product)
  saveLocal(list)
  return decorate(product)
}

// 商家删除商品(id 为 string 或 string[])
async function removeProduct(ids) {
  await delay()
  const idArr = Array.isArray(ids) ? ids : [ids]
  const list = loadLocal().filter(p => idArr.indexOf(p.id) === -1)
  saveLocal(list)
  return list
}

// 商家批量更新商品(如批量打标签/改归类)
// patch = { gender, part, group, subGroup } 等字段, 部分更新
async function updateProducts(ids, patch) {
  await delay()
  const idArr = Array.isArray(ids) ? ids : [ids]
  const list = loadLocal().map(p => {
    if (idArr.indexOf(p.id) === -1) return p
    return Object.assign({}, p, patch)
  })
  saveLocal(list)
  return list
}

module.exports = {
  getHomeData,
  getProducts,
  getProduct,
  searchProducts,
  getLocalProducts,
  addProduct,
  removeProduct,
  updateProducts,
  loadLocal
}
