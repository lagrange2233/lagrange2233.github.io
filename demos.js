/* ============================================================
   演示清单 —— 全站唯一的数据源。
   新增一个演示：把页面放进 demos/<slug>/index.html，
   然后在下面 demos 数组里加一条记录（复制最后一条改内容即可）。
   字段说明：
     slug   演示文件夹名（同时作为唯一 id）
     path   从站点根到演示页的相对路径，必须以 / 结尾
     title  卡片标题，可以用 $...$ 写公式
     subtitle 一句话说明「拖动什么、能看到什么」
     topic  专题（会出现在顶部筛选条里）
     grade  适用年级，可留空
     level  难度 1~3
     tags   知识点标签数组
     date   上线日期 YYYY-MM-DD（首页按它倒序排列）
   ============================================================ */
window.DEMOS = {
  site: {
    title: "高中数学 · 动态演示",
    repo: "https://github.com/lagrange2233/lagrange2233.github.io"   // 首页页脚的「源码 / 更新记录」链接
  },
  demos: [
    {
      slug: "circle-3points",
      path: "demos/circle-3points/",
      title: "圆上到直线距离为 1 的点，个数可能是 0、1、2、3、4",
      subtitle: "拖动直线 $y=x+b$，看两条平行线与圆的公共点个数如何跳变",
      topic: "解析几何",
      grade: "高二",
      level: 3,
      tags: ["直线与圆", "点到直线距离", "分类讨论"],
      date: "2026-10-21"
    }
  ]
};
