// 云函数: recordVisit - 用户访问自统计
// 背景: 云开发控制台自带「运营分析-用户访问」在个人版环境不展示/有延迟,
//       改为自己记录, 实时可控。
// 逻辑: 按 openid upsert 到 users 集合(firstVisit/lastVisit),
//       首次访问新增, 之后只更新 lastVisit。
// 查看: 云开发控制台 -> 数据库 -> users 集合(openid 列表即访问用户)
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const USERS_COLL = 'users'

exports.main = async () => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return { ok: false, msg: 'no openid' }

  try {
    const coll = db.collection(USERS_COLL)
    const now = Date.now()
    const res = await coll.where({ openid: OPENID }).count()

    if (res.total === 0) {
      // 首次访问: 新增记录
      await coll.add({
        data: { openid: OPENID, firstVisit: now, lastVisit: now }
      })
    } else {
      // 再次访问: 只刷新 lastVisit
      await coll.where({ openid: OPENID }).update({
        data: { lastVisit: now }
      })
    }
    return { ok: true }
  } catch (e) {
    // 统计失败不影响业务, 静默返回
    console.error('recordVisit error:', e.message)
    return { ok: false, msg: e.message }
  }
}
