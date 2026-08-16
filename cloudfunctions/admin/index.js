// 云函数: admin - 商家管理端统一入口
// 职责:
//   1. check  校验当前用户是否在白名单(admins 集合) -> 管理页登录
//   2. list   读取全部商品(仅管理员)
//   3. add    新增商品(仅管理员, 管理权限写入, 绕过客户端权限限制)
//   4. remove 删除商品(仅管理员)
//   5. update 批量更新商品(仅管理员, 如批量打标签/改归类)
// 白名单维护: 云开发控制台 -> 数据库 -> admins 集合, 手动增删 openid 记录
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const PRODUCTS_COLL = 'products'
const ADMINS_COLL = 'admins'

// 允许被批量更新的字段白名单(防止恶意篡改任意字段)
const UPDATE_FIELDS = ['name', 'gender', 'part', 'group', 'subGroup']

async function isAdmin(openid) {
  if (!openid) return false
  const res = await db.collection(ADMINS_COLL).where({ openid }).count()
  return res.total > 0
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  // 防御: action 统一转字符串并去首尾空白, 防止误传 'update ' / ' update' 等导致"未知操作"
  const action = String(event.action || '').trim()
  // 日志: 记录每次调用者的 openid 与操作(用于白名单排查/用户管理; 被拒用户也会记录)
  console.log('admin call:', JSON.stringify({ openid: OPENID, action }))

  try {
    // 白名单校验(任何操作前)
    const admin = await isAdmin(OPENID)
    if (!admin) {
      return { code: 403, msg: '无权限：仅商家可操作' }
    }

    if (action === 'check') {
      return { code: 0, isAdmin: true }
    }

    if (action === 'list') {
      const res = await db.collection(PRODUCTS_COLL)
        .orderBy('createTime', 'desc')
        .limit(500)
        .get()
      return { code: 0, data: res.data }
    }

    if (action === 'add') {
      const p = Object.assign({}, event.product, {
        _openid: OPENID,
        createTime: Date.now()
      })
      const res = await db.collection(PRODUCTS_COLL).add({ data: p })
      return { code: 0, data: Object.assign({}, p, { _id: res._id }) }
    }

    if (action === 'remove') {
      const ids = event.ids || []
      for (const id of ids) {
        await db.collection(PRODUCTS_COLL).doc(id).remove()
      }
      return { code: 0, data: ids }
    }

    if (action === 'update') {
      const ids = event.ids || []
      const patch = event.patch || {}
      // 只取白名单字段, 忽略其他字段
      const data = {}
      UPDATE_FIELDS.forEach(k => {
        if (patch[k] !== undefined) data[k] = patch[k]
      })
      if (!ids.length || !Object.keys(data).length) {
        return { code: 400, msg: '缺少更新目标或更新内容' }
      }
      for (const id of ids) {
        await db.collection(PRODUCTS_COLL).doc(id).update({ data })
      }
      return { code: 0, data: ids }
    }

    return { code: 400, msg: '未知操作: ' + action }
  } catch (e) {
    return { code: 500, msg: e.message || '服务器错误' }
  }
}
