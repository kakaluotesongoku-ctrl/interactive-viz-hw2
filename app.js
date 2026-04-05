// 1. 声明全局变量，初始为空数组
let rawData = [];

// 设定默认的年份和国家（请确保你的 data.json 中存在这些数据）
let currentYear = 2020;
let selectedCountry = 'USA'; 

const barChart = echarts.init(document.getElementById('barChart'));
const lineChart = echarts.init(document.getElementById('lineChart'));

// ==========================================
// 核心修改：使用 fetch 异步获取 data.json
// ==========================================
fetch('data.json')
    .then(response => {
        if (!response.ok) {
            throw new Error('网络响应错误: ' + response.statusText);
        }
        return response.json(); // 解析 JSON 数据
    })
    .then(data => {
        // 将获取到的数据赋值给全局变量
        rawData = data;

        // 也可以在这里动态获取数据中的最新年份设置给滑动条
        // 例如：
        // const years = [...new Set(rawData.map(d => d.year))].sort();
        // currentYear = years[years.length - 1]; 
        // document.getElementById('yearSlider').value = currentYear;
        // document.getElementById('yearLabel').innerText = currentYear;

        // 数据加载成功后，进行第一次（初始）图表渲染
        updateBarChart(currentYear);
        updateLineChart(selectedCountry);
    })
    .catch(error => {
        console.error('获取数据失败:', error);
        alert('无法加载 data.json！请确保你在本地服务器环境下运行 (如 VSCode Live Server)，而不是直接双击打开 HTML。');
    });

// ==========================================
// 以下为图表更新函数与交互逻辑
// ==========================================

// 2. 初始化柱状图（某一年份的横向排序柱状图）
function updateBarChart(year) {
    // 过滤并排序该年份的数据 
    // 注意：如果是真实世界数据（比如包含全球200个国家），建议加上 .slice(-20) 只取前20名，否则图表会非常拥挤
    const yearData = rawData
        .filter(d => d.year == year)
        .sort((a, b) => a.emissions - b.emissions)
        .slice(-20); // 提取排放量最高的 20 个国家（可选，强烈建议加上）
    
    const option = {
        title: { text: `${year}年 人均排放量 Top 国家` },
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        grid: { left: '15%', right: '5%', bottom: '10%' }, // 留出左侧空间显示国家名
        xAxis: { type: 'value', name: 'KG CO2E' },
        yAxis: { type: 'category', data: yearData.map(d => d.country) },
        series: [{
            type: 'bar',
            data: yearData.map(d => ({
                value: d.emissions,
                itemStyle: { color: d.country === selectedCountry ? '#e74c3c' : '#3498db' } // 高亮当前选中项
            }))
        }]
    };
    barChart.setOption(option);
}

// 3. 初始化折线图（选中国家的历史趋势）
function updateLineChart(country) {
    const countryData = rawData
        .filter(d => d.country === country)
        .sort((a, b) => a.year - b.year); // 确保按年份先后顺序连线
    
    const option = {
        title: { text: `${country} 2014-至今 排放趋势` },
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: countryData.map(d => d.year) },
        yAxis: { type: 'value', name: 'KG CO2E', min: 'dataMin' }, // Y轴从最小值开始，更能突显趋势变化
        series: [{
            data: countryData.map(d => d.emissions),
            type: 'line',
            smooth: true, // 平滑曲线
            areaStyle: { opacity: 0.2 }, // 面积填充
            lineStyle: { width: 3, color: '#e74c3c' },
            itemStyle: { color: '#e74c3c' }
        }]
    };
    lineChart.setOption(option);
}

// 4. 交互逻辑 (多视图联动)

// 滑动条改变年份
document.getElementById('yearSlider').addEventListener('input', (e) => {
    currentYear = e.target.value;
    document.getElementById('yearLabel').innerText = currentYear;
    updateBarChart(currentYear);
});

// 点击柱状图，更新折线图
barChart.on('click', function (params) {
    selectedCountry = params.name;
    updateBarChart(currentYear); // 重新渲染柱状图，以更新红色高亮
    updateLineChart(selectedCountry); // 更新右侧折线图
});

// 重置按钮
document.getElementById('resetBtn').addEventListener('click', () => {
    selectedCountry = 'USA'; // 重置为默认国家
    currentYear = 2020;      // 重置为默认年份
    document.getElementById('yearSlider').value = currentYear;
    document.getElementById('yearLabel').innerText = currentYear;
    
    updateBarChart(currentYear);
    updateLineChart(selectedCountry);
});

// 响应式布局：当浏览器窗口大小改变时，图表自适应缩放
window.addEventListener('resize', () => {
    barChart.resize();
    lineChart.resize();
});
