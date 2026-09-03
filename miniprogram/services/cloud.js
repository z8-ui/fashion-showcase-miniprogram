// cloud.js - 云开发数据层(正式版)
// 与 mock.js 导出同签名函数, 页面代码零改动。
// 架构:
//   读商品     -> 客户端直读云数据库(集合权限: 所有用户可读)
//   写商品     -> admin 云函数(admins 白名单校验 + 管理权限写入)
//   商品图片   -> 客户端直传云存储, 数据库存 fileID(cloud://)
// 数据库集合:
//   products  商品: { _id, name, gender, part, group, subGroup?, media:[{type,url,poster?}], createTime }
//   admins    管理白名单: { openid }  (云开发控制台手动维护)
const config = require('../utils/config')

const db = wx.cloud.database()
const PRODUCTS_COLL = 'products'

// 商品补充派生字段: id(云数据库 _id -> id, 兼容本地版) + 封面图
//   image -> url; video -> poster(视频封面)
function decorate(p) {
  const first = (p.media || [])[0] || {}
  return Object.assign({}, p, {
    id: p._id || p.id,
    cover: first.type === 'video' ? (first.poster || '') : (first.url || ''),
    isVideo: first.type === 'video'
  })
}

// ---------------- 查询工具 ----------------
function escapeReg(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// 组装 where 条件(精确匹配 + 名称模糊)
function buildCond(filter = {}) {
  const cond = {}
  if (filter.gender) cond.gender = filter.gender
  if (filter.part) cond.part = filter.part
  if (filter.group) cond.group = filter.group
  if (filter.subGroup) cond.subGroup = filter.subGroup
  if (filter.keyword) {
    const kw = String(filter.keyword).trim()
    if (kw) cond.name = db.RegExp({ regexp: escapeReg(kw), options: 'i' })
  }
  return cond
}

// ---------------- 对外查询函数(全部 Promise) ----------------
// 首页: 轮播宣传图(图源与文案统一在 utils/config.js 的 HOME_BANNERS 配置)
async function getHomeData() {
  const banners = config.HOME_BANNERS.map((b, i) => ({
    id: 'hb' + (i + 1),
    image: b.image,
    title: b.title
  }))
  return { banners }
}

// 商品池列表: 按 专区(gender/part)/组别/关键词 过滤
// 分页: page 从 0 开始, 每页 pageSize 条(默认 20, 上限 100)
async function getProducts(filter = {}, page = 0, pageSize = 20) {
  const cond = buildCond(filter)
  let query = db.collection(PRODUCTS_COLL)
  if (Object.keys(cond).length) query = query.where(cond)
  const res = await query
    .orderBy('createTime', 'desc')
    .skip(page * pageSize)
    .limit(pageSize)
    .get()
  return { list: res.data.map(decorate) }
}

// 商品详情
async function getProduct(id) {
  const res = await db.collection(PRODUCTS_COLL).doc(id).get()
  return decorate(res.data)
}

// 搜索(商品名模糊匹配)
async function searchProducts(keyword) {
  const kw = String(keyword || '').trim()
  if (!kw) return []
  const cond = buildCond({ keyword: kw })
  const res = await db.collection(PRODUCTS_COLL).where(cond).orderBy('createTime', 'desc').limit(100).get()
  return res.data.map(decorate)
}

// ---------------- 商家操作(走 admin 云函数, 白名单校验) ----------------
async function callAdmin(data) {
  const res = await wx.cloud.callFunction({ name: 'admin', data })
  const r = res.result || {}
  if (r.code !== 0) throw new Error(r.msg || '操作失败')
  return r
}

// 校验当前用户是否为商家(管理页入口)
async function checkAdmin() {
  try {
    const r = await callAdmin({ action: 'check' })
    return !!r.isAdmin
  } catch (e) {
    return false
  }
}

// 商家上传商品
async function addProduct(p) {
  const r = await callAdmin({ action: 'add', product: p })
  return decorate(r.data)
}

// 商家删除商品
async function removeProduct(ids) {
  const r = await callAdmin({ action: 'remove', ids: Array.isArray(ids) ? ids : [ids] })
  return r.data
}

// 商家批量更新商品(如批量打标签/改归类, 走 admin 云函数白名单校验)
async function updateProducts(ids, patch) {
  const r = await callAdmin({
    action: 'update',
    ids: Array.isArray(ids) ? ids : [ids],
    patch
  })
  return r.data
}

// 商家已上传列表
async function getLocalProducts() {
  const r = await callAdmin({ action: 'list' })
  return r.data.map(decorate)
}

module.exports = {
  getHomeData,
  getProducts,
  getProduct,
  searchProducts,
  addProduct,
  removeProduct,
  updateProducts,
  getLocalProducts,
  checkAdmin
}
