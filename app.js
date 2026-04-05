// 假设你已经将OECD数据清洗为以下结构的全局变量，实际开发中请使用 fetch('data.json')
// 这里为了演示，生成模拟的样本数据。请将其替换为真实的OECD数据。
fetch('data.json');

let currentYear = 2020;
let selectedCountry = 'USA'; // 默认选中国家

const barChart = echarts.init(document.getElementById('barChart'));
const lineChart = echarts.init(document.getElementById('lineChart'));

// 1. 初始化柱状图（某一年份的横向排序柱状图）
function updateBarChart(year) {
    // 过滤并排序该年份的数据
    const yearData = rawData.filter(d => d.year == year).sort((a, b) => a.emissions - b.emissions);
    
    const option = {
        title: { text: `${year}年 人均排放量 Top 国家` },
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
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

// 2. 初始化折线图（选中国家的历史趋势）
function updateLineChart(country) {
    const countryData = rawData.filter(d => d.country === country).sort((a, b) => a.year - b.year);
    
    const option = {
        title: { text: `${country} 2014-至今 排放趋势` },
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: countryData.map(d => d.year) },
        yAxis: { type: 'value', name: 'KG CO2E' },
        series: [{
            data: countryData.map(d => d.emissions),
            type: 'line',
            smooth: true,
            areaStyle: { opacity: 0.2 },
            lineStyle: { width: 3, color: '#e74c3c' },
            itemStyle: { color: '#e74c3c' }
        }]
    };
    lineChart.setOption(option);
}

// 3. 交互逻辑 (多视图联动)
// 滑动条改变年份
document.getElementById('yearSlider').addEventListener('input', (e) => {
    currentYear = e.target.value;
    document.getElementById('yearLabel').innerText = currentYear;
    updateBarChart(currentYear);
});

// 点击柱状图，更新折线图
barChart.on('click', function (params) {
    selectedCountry = params.name;
    updateBarChart(currentYear); // 重新渲染以更新高亮颜色
    updateLineChart(selectedCountry);
});

// 重置按钮
document.getElementById('resetBtn').addEventListener('click', () => {
    selectedCountry = 'USA';
    currentYear = 2020;
    document.getElementById('yearSlider').value = 2020;
    document.getElementById('yearLabel').innerText = 2020;
    updateBarChart(currentYear);
    updateLineChart(selectedCountry);
});

// 初始渲染
updateBarChart(currentYear);
updateLineChart(selectedCountry);

// 响应式布局
window.addEventListener('resize', () => {
    barChart.resize();
    lineChart.resize();
});