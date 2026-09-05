// 全局配置
// 注意: 本文件只放"静态常量", 不放业务逻辑。
//
// ⭐ 开源模板使用说明:
//   想改成你自己的品牌/商品类目, 全局只需改这一个文件:
//     1. 品牌信息(APP_NAME / BRAND_NAME / BRAND_SLOGAN / CONTACT_WECHAT)
//     2. 商品专区 ZONES(分类结构, 目前是童装四专区示例)
//   改完 config.js 后, 再把 app.json 与 pages/index/index.json 里的
//   navigationBarTitleText 同步成你的品牌名即可(共两处)。

// ========== 品牌信息(部署时改成你自己的) ==========
const APP_NAME = '童装优选'            // 小程序名(导航栏/分享卡片兜底标题)
const BRAND_NAME = '童装优选'          // 首页顶部品牌名
const BRAND_SLOGAN = '童装好物 · 组别齐全 · 微信联系下单'  // 首页品牌标语
const CONTACT_WECHAT = 'your-wechat-id'   // 首页"联系商家"弹窗显示的微信号(占位符)

// ========== 首页轮播宣传图 ==========
// image: 包内图片路径或云存储 fileID 都行; title: 轮播文案
// 开源版默认空轮播; 部署时把宣传图放入 miniprogram/images/1.jpg 后,
// 在本地 config.local.js 中覆盖 HOME_BANNERS(该文件不入库, 见文件末尾说明)。
const HOME_BANNERS = []

module.exports = {
  APP_NAME,
  BRAND_NAME,
  BRAND_SLOGAN,
  CONTACT_WECHAT,
  HOME_BANNERS,

  // 后端接口地址(留空 = 使用本地数据)
  BASE_URL: '',

  // 数据源开关:
  //   'local'  本地持久化商品库(单机演示, 无后台依赖)
  //   'cloud'  云开发云存储+云数据库(正式版, 全用户共享)
  DATA_SOURCE: 'cloud',

  // 云开发环境 ID(留空 = 默认环境; 多个环境时填具体 envID)
  CLOUD_ENV: '',

  // 商品专区: 首页四入口卡片 + 组别/小分组三级分类
  // gender: boy男童 girl女童;  part: top上衣 pants裤子
  // groups: 专区下的组别(点进专区显示组别小卡片)
  // subGroups: 可选, 组别下的第三级小分组(如 青少年组 -> 牛仔裤/休闲裤/工装裤)
  //            格式: { 组别名: [小分组, ...] }; 未配置的组别/专区不显示小分组
  // bg: 卡片渐变背景
  ZONES: [
    {
      key: 'boy-pants', name: '男童裤子专区', gender: 'boy', part: 'pants',
      bg: 'linear-gradient(135deg, #E3F0FF, #C7E1FF)',
      groups: ['宝宝组', '小童组', '中童组', '大童组', '青少年组'],
      subGroups: {
        '宝宝组': ['牛仔裤', '休闲裤'],
        '小童组': ['牛仔裤', '休闲裤', '工装裤'],
        '中童组': ['牛仔裤', '休闲裤', '工装裤'],
        '大童组': ['牛仔裤', '休闲裤', '工装裤'],
        '青少年组': ['牛仔裤', '休闲裤', '工装裤']
      }
    },
    {
      key: 'girl-pants', name: '女童裤子专区', gender: 'girl', part: 'pants',
      bg: 'linear-gradient(135deg, #FFE9F0, #FFD3E2)',
      groups: ['宝宝组', '小童组', '中童组', '大童组'],
      subGroups: {
        '宝宝组': ['牛仔裤', '休闲裤'],
        '小童组': ['牛仔裤', '休闲裤'],
        '中童组': ['牛仔裤', '休闲裤'],
        '大童组': ['牛仔裤', '休闲裤']
      }
    },
    {
      key: 'boy-top', name: '男童上衣专区', gender: 'boy', part: 'top',
      bg: 'linear-gradient(135deg, #E8F7E8, #D2F0D2)',
      groups: ['小童组', '中童组', '大童组', '外套组']
    },
    {
      key: 'girl-top', name: '女童上衣专区', gender: 'girl', part: 'top',
      bg: 'linear-gradient(135deg, #FFF4E3, #FFE6C2)',
      groups: ['小童组', '中童组', '大童组', '外套组']
    }
  ],

  // 商家上传商品 -> 本地存储 key(⚠️ 勿改, 改动会导致旧数据不可见)
  PRODUCTS_KEY: 'zhuzhu_products'
}

// ========== 本地私有覆盖(不入库) ==========
// 同目录放一个 config.local.js(已在 .gitignore), 即可覆盖上方任意配置:
//   module.exports = {
//     CONTACT_WECHAT: '你的真实微信号',
//     HOME_BANNERS: [ { image: '/images/1.jpg', title: '欢迎选购' }, ... ],
//   }
// 这样 GitHub 公开版永远只含占位符, 本地真实配置不会误传。
try {
  const _local = require('./config.local.js')
  Object.keys(_local).forEach(k => { module.exports[k] = _local[k] })
} catch (e) { /* 无本地配置时忽略 */ }
