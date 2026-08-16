// api.js - 统一数据出口(页面只 import 本文件)
// 架构要点:
//   1. 页面代码只依赖这里导出的函数, 永远不直接 require mock.js / cloud.js
//   2. DATA_SOURCE='local' 走本地演示; 'cloud' 走云开发(正式版)
//      两个实现同签名, 切换数据源页面代码零改动
//   3. 所有函数返回 Promise
const config = require('../utils/config')
const impl = config.DATA_SOURCE === 'cloud' ? require('./cloud') : require('./mock')

module.exports = {
  getHomeData: impl.getHomeData,
  getProducts: impl.getProducts,
  getProduct: impl.getProduct,
  searchProducts: impl.searchProducts,
  addProduct: impl.addProduct,
  removeProduct: impl.removeProduct,
  updateProducts: impl.updateProducts,
  getLocalProducts: impl.getLocalProducts,
  // 本地模式无白名单概念, 管理页用密码锁自行处理, 这里兜底放行
  checkAdmin: impl.checkAdmin || (async () => true)
}
