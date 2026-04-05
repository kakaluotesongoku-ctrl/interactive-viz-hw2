let rawData = [];
let currentYear = 2020;
let selectedCountry = 'USA'; // 默认国家

const barChart = echarts.init(document.getElementById('barChart'));
const lineChart = echarts.init(document.getElementById('lineChart'));

// 显示加载动画
barChart.showLoading();
lineChart.showLoading();

// 使用 ./ 确保在 GitHub Pages 的子目录中也能正确找到文件
fetch('./data.json')
    .then(response => {
        if (!response.ok) throw new Error('网络响应错误');
        return response.json();
    })
    .then(data => {
        // 【关键修复在这里】自动将 OECD 的长表头映射为我们需要的小写表头
        rawData = data.map(d => {
            return {
                // 如果有小写的 country 就用小写，没有就找 'Reference area' 或 'REF_AREA'
                country: d.country || d['Reference area'] || d['REF_AREA'] || '未知国家',
                // 同理，转换年份
                year: parseInt(d.year || d['TIME_PERIOD'] || d['Time period']),
                // 同理，转换排放量数值
                emissions: parseFloat(d.emissions || d['OBS_VALUE'] || d['Observation value'])
            };
        }).filter(d => !isNaN(d.emissions)); // 过滤掉没有数值的空行

        // 动态获取数据中最小和最大的年份，初始化滑动条
        const years = [...new Set(rawData.map(d => d.year))].sort((a,b) => a-b);
        if (years.length === 0) {
            alert("数据加载成功，但在数据中找不到年份或数值字段，请检查 JSON 内容！");
            return;
        }

        const minYear = years[0];
        const maxYear = years[years.length - 1];
        
        const slider = document.getElementById('yearSlider');
        slider.min = minYear;
        slider.max = maxYear;
        
        // 默认显示最新一年和该年排放最高的国家
        currentYear = maxYear;
        slider.value = currentYear;
        document.getElementById('yearLabel').innerText = currentYear;
        
        const topCountry = rawData.filter(d => d.year == currentYear).sort((a,b) => b.emissions - a.emissions)[0];
        if(topCountry) selectedCountry = topCountry.country;

        // 关闭加载动画并渲染
        barChart.hideLoading();
        lineChart.hideLoading();
        updateBarChart(currentYear);
        updateLineChart(selectedCountry);
    })
    .catch(error => {
        console.error('加载 JSON 失败:', error);
        barChart.hideLoading();
        lineChart.hideLoading();
    });


function updateBarChart(year) {
    // 过滤并取出前20名
    const yearData = rawData
        .filter(d => d.year == year)
        .sort((a, b) => a.emissions - b.emissions)
        .slice(-20);
    
    const option = {
        title: { text: `${year}年 人均排放量 Top 20 国家/地区`, left: 'center' },
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        grid: { left: '20%', right: '8%', bottom: '10%' }, 
        xAxis: { type: 'value', name: 'KG CO2E' },
        yAxis: { type: 'category', data: yearData.map(d => d.country) },
        series: [{
            type: 'bar',
            data: yearData.map(d => ({
                value: d.emissions,
                itemStyle: { color: d.country === selectedCountry ? '#e74c3c' : '#3498db' }
            }))
        }]
    };
    barChart.setOption(option);
}

function updateLineChart(country) {
    const countryData = rawData
        .filter(d => d.country === country)
        .sort((a, b) => a.year - b.year);
    
    const option = {
        title: { text: `${country} 历年排放趋势`, left: 'center' },
        tooltip: { trigger: 'axis' },
        grid: { left: '15%', right: '10%', bottom: '10%' },
        xAxis: { type: 'category', data: countryData.map(d => d.year) },
        yAxis: { type: 'value', name: 'KG CO2E', min: 'dataMin' }, 
        series: [{
            data: countryData.map(d => d.emissions),
            type: 'line',
            smooth: true,
            areaStyle: { opacity: 0.2, color: '#e74c3c' },
            lineStyle: { width: 3, color: '#e74c3c' },
            itemStyle: { color: '#e74c3c' }
        }]
    };
    lineChart.setOption(option);
}

// 事件监听
document.getElementById('yearSlider').addEventListener('input', (e) => {
    currentYear = e.target.value;
    document.getElementById('yearLabel').innerText = currentYear;
    updateBarChart(currentYear);
});

barChart.on('click', function (params) {
    selectedCountry = params.name;
    updateBarChart(currentYear); 
    updateLineChart(selectedCountry);
});

document.getElementById('resetBtn').addEventListener('click', () => {
    const years = [...new Set(rawData.map(d => d.year))].sort((a,b) => a-b);
    currentYear = years[years.length - 1];
    document.getElementById('yearSlider').value = currentYear;
    document.getElementById('yearLabel').innerText = currentYear;
    
    const topCountry = rawData.filter(d => d.year == currentYear).sort((a,b) => b.emissions - a.emissions)[0];
    if(topCountry) selectedCountry = topCountry.country;
    
    updateBarChart(currentYear);
    updateLineChart(selectedCountry);
});

window.addEventListener('resize', () => {
    barChart.resize();
    lineChart.resize();
});
