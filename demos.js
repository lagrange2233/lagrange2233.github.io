/* ============================================================
   演示清单 —— 全站唯一的数据源。
   新增一个演示：把页面放进 demos/<slug>/index.html，
   然后在下面 demos 数组里加一条记录（复制最后一条改内容即可）。

   三类标签（索引页按这三类做筛选，字段名固定）：
     topic   知识点   如 "解析几何"、"函数与导数"
     grade   年级     如 "高一"、"高二"、"高三"
     book    课本     如 "选择性必修二"、"必修一"

   其他字段：
     slug   演示文件夹名（同时作为唯一 id）
     path   从站点根到演示页的相对路径，必须以 / 结尾
     title  卡片标题，可以用 $...$ 写公式
     subtitle 一句话说明「拖动什么、能看到什么」
     level  难度 1~3
     tags   额外关键词（可选，只参与搜索，不显示成标签）
     date   上线日期 YYYY-MM-DD（默认按它倒序排列）
   ============================================================ */
window.DEMOS = {
  site: {
    title: "高中数学 · 动态演示",
    repo: "https://github.com/lagrange2233/lagrange2233.github.io"   // 首页页脚的「源码 / 更新记录」链接
  },
  /* ⚠️ 每条记录必须填 topic / grade / book 三类标签，缺一不可：
     索引页的三行筛选就是按这三个字段做的，漏了这条演示在筛选里会失踪。 */
  demos: [
    {
      slug: "ellipse-rope",
      path: "demos/ellipse-rope/",
      title: "椭圆的第一定义",
      subtitle: "定长细绳的两端从同一点慢慢拉开，笔尖的轨迹从圆连续变成椭圆，而两段绳长之和始终是定值 $2a$",
      topic: "解析几何",
      grade: "高二",
      book: "选择性必修一",
      level: 1,
      tags: ["椭圆", "第一定义", "焦点", "绳长", "距离之和为定值", "圆锥曲线"],
      date: "2026-10-26"
    },
    {
      slug: "conic-sections",
      path: "demos/conic-sections/",
      title: "圆锥曲线",
      subtitle: "转动截面与轴的夹角 $\\gamma$，看截口在圆、椭圆、抛物线、双曲线之间连续切换",
      topic: "解析几何",
      grade: "高二",
      book: "选择性必修一",
      level: 2,
      tags: ["圆锥曲线", "截面", "离心率", "双曲线", "抛物线", "椭圆"],
      date: "2026-10-26"
    },
    {
      slug: "circle-3points",
      path: "demos/circle-3points/",
      title: "圆上到直线距离等于定长的点的个数问题",
      subtitle: "拖动直线 $y=x+b$，看两条平行线与圆的公共点个数如何跳变",
      topic: "解析几何",
      grade: "高二",
      book: "选择性必修一",
      level: 3,
      tags: ["直线与圆", "点到直线距离", "分类讨论"],
      date: "2026-10-21"
    },
    {
      slug: "chord-min",
      path: "demos/chord-min/",
      title: "过圆内一定点的直线被圆截得弦长的最小值",
      subtitle: "拖动倾斜角 $\\alpha$ 转动过 $P_0$ 的弦，看弦长如何被「圆心到弦的距离」$d$ 控制",
      topic: "解析几何",
      grade: "高二",
      book: "选择性必修一",
      level: 2,
      tags: ["直线与圆", "弦长", "垂径定理", "最值"],
      date: "2026-10-25"
    }
  ]
};
