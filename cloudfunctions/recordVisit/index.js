// 云函数: recordVisit - 用户访问自统计
// 背景: 云开发控制台自带「运营分析-用户访问」在个人版环境不展示/有延迟,
//       改为自己记录, 实时可控。
// 逻辑: 按 openid upsert 到 users 集合(firstVisit/lastVisit),
//       首次访问新增, 之后只更新 lastVisit。
// 查看: 云开发控制台 -> 数据库 -> users 集合(openid 列表即访问用户)
//
// ⚠️ 防滥用(2026-09): 云函数对小程序所有用户可调用, 恶意脚本可高频刷调用
//    -> 每次调用都写库, 烧数据库读写次数与费用。
//    处理: 同一 openid 60 秒内只统计一次, 其余调用直接跳过(不写库)。
//    该限流只影响统计数据刷新频率, 与看图/商家上传等业务完全无关
//    (业务走 products 集合直读与 admin 云函数, 不经过本函数)。
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const USERS_COLL = 'users'
const THROTTLE_MS = 60 * 1000   // 同一用户统计最小间隔: 60 秒

exports.main = async () => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return { ok: false, msg: 'no openid' }

  try {
    const coll = db.collection(USERS_COLL)
    const now = Date.now()

    // 查已有记录(取 _id 用于定点更新, 同时避免 count+add 的并发重复)
    const res = await coll.where({ openid: OPENID }).limit(1).get()

    if (res.data.length) {
      const user = res.data[0]
      // 限流: 距上次统计不足 60 秒则跳过, 不产生任何写操作
      if (now - (user.lastVisit || 0) < THROTTLE_MS) {
        return { ok: true, throttled: true }
      }
      // 再次访问: 只刷新 lastVisit
      await coll.doc(user._id).update({ data: { lastVisit: now } })
    } else {
      // 首次访问: 新增记录
      await coll.add({ data: { openid: OPENID, firstVisit: now, lastVisit: now } })
    }
    return { ok: true }
  } catch (e) {
    // 统计失败不影响业务, 静默返回
    console.error('recordVisit error:', e.message)
    return { ok: false, msg: e.message }
  }
}
