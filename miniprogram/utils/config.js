// ZhuzhuShop 全局配置
// 注意: 本文件只放"静态常量", 不放业务逻辑。

module.exports = {
  APP_NAME: '珠珠童装',

  // 后端接口地址(留空 = 使用本地数据)
  BASE_URL: '',

  // 数据源开关:
  //   'local'  内置演示商品 + 本地持久化商品库(测试号阶段, 本机可见)
  //   'cloud'  云开发云存储+云数据库(正式版, 全用户共享)
  DATA_SOURCE: 'cloud',

  // 云开发环境 ID(留空 = 默认环境; 多个环境时填具体 envID)
  CLOUD_ENV: '',

  // 商家微信号(首页"新客联系商家"弹窗显示)
  // 注意: 仓库内为占位符, 部署时替换为真实商家微信号
  CONTACT_WECHAT: 'your-wechat-id',

  // 四大专区(甲方要求: 男童裤子/女童裤子/男童上衣/女童上衣)
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

  // 商家上传商品 -> 本地存储 key
  PRODUCTS_KEY: 'zhuzhu_products'
}
