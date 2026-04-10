let rawData = [];
let currentYear = 2014;
let selectedCountry = "";
let isPlaying = false;
let timer = null;

const barChart = echarts.init(document.getElementById('barChart'));
const lineChart = echarts.init(document.getElementById('lineChart'));

fetch('./data.json').then(res => res.json()).then(data => {
    rawData = data;
    // 初始设置
    const years = [...new Set(rawData.map(d => d.year))].sort();
    currentYear = years[years.length - 1];
    
    // 找到默认国家（最新年份的第一名）
    selectedCountry = rawData.filter(d => d.year == currentYear)
                             .sort((a,b) => b.emissions - a.emissions)[0].country;
    
    updateAll();
});

function updateAll() {
    updateBarChart();
    updateLineChart();
    updateInsightCard();
}

function updateBarChart() {
    const yearData = rawData.filter(d => d.year == currentYear)
                            .sort((a, b) => a.emissions - b.emissions).slice(-15);
    
    const option = {
        title: { text: `🌍 排放量排名 (${currentYear})`, left: 'left', textStyle: { fontWeight: 600 } },
        tooltip: { trigger: 'axis' },
        grid: { left: '18%', right: '10%', top: '15%', bottom: '10%' },
        xAxis: { type: 'value', splitLine: { show: false } },
        yAxis: { 
            type: 'category', 
            data: yearData.map(d => d.country),
            axisLabel: { fontWeight: 600 }
        },
        animationDurationUpdate: 1000, // 丝滑的超车动画
        series: [{
            type: 'bar',
            realtimeSort: true,
            data: yearData.map(d => ({
                value: d.emissions,
                itemStyle: { 
                    color: d.country === selectedCountry ? '#e74c3c' : '#bdc3c7',
                    borderRadius: [0, 5, 5, 0]
                }
            })),
            label: { show: true, position: 'right', valueAnimation: true }
        }]
    };
    barChart.setOption(option);
}

function updateLineChart() {
    const countryData = rawData.filter(d => d.country === selectedCountry).sort((a,b) => a.year - b.year);
    
    // 计算全球平均值作为基准 (创新元素)
    const years = [...new Set(rawData.map(d => d.year))].sort();
    const avgData = years.map(y => {
        const yearEmissions = rawData.filter(d => d.year === y).map(d => d.emissions);
        return (yearEmissions.reduce((a,b) => a+b, 0) / yearEmissions.length).toFixed(2);
    });

    const option = {
        title: { text: `📈 ${selectedCountry} 历史趋势 vs 全球平均`, left: 'left' },
        legend: { data: [selectedCountry, '全球平均'], top: '10%' },
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: years },
        yAxis: { type: 'value', name: 'KG CO2E' },
        series: [
            {
                name: selectedCountry,
                data: countryData.map(d => d.emissions),
                type: 'line', smooth: true, symbolSize: 10,
                lineStyle: { width: 4, color: '#e74c3c' },
                itemStyle: { color: '#e74c3c' },
                areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: 'rgba(231, 76, 60, 0.4)' },
                    { offset: 1, color: 'rgba(231, 76, 60, 0)' }
                ]) },
                // 标注当前年份的点 (多视图协调)
                markPoint: {
                    data: [{ name: '当前', value: currentYear, xAxis: currentYear.toString(), yAxis: countryData.find(d => d.year == currentYear)?.emissions }]
                }
            },
            {
                name: '全球平均',
                data: avgData,
                type: 'line', smooth: true, lineStyle: { type: 'dashed', color: '#bdc3c7' },
                symbol: 'none'
            }
        ]
    };
    lineChart.setOption(option);
}

function updateInsightCard() {
    const countryData = rawData.filter(d => d.country === selectedCountry).sort((a,b) => a.year - b.year);
    if(countryData.length > 1) {
        const first = countryData[0].emissions;
        const last = countryData[countryData.length-1].emissions;
        const change = (((last - first) / first) * 100).toFixed(1);
        const direction = change > 0 ? "增加" : "减少";
        
        document.getElementById('insightText').innerHTML = 
            `已选中 <strong>${selectedCountry}</strong>。自 2014 年以来，该国人均排放量已 <strong>${direction} ${Math.abs(change)}%</strong>。`;
    }
}

// 高级交互：自动播放逻辑
document.getElementById('playBtn').addEventListener('click', function() {
    isPlaying = !isPlaying;
    this.innerText = isPlaying ? "⏸ 暂停" : "▶ 播放历史";
    if(isPlaying) {
        timer = setInterval(() => {
            currentYear++;
            if(currentYear > 2021) currentYear = 2014;
            document.getElementById('yearSlider').value = currentYear;
            document.getElementById('yearLabel').innerText = currentYear;
            updateAll();
        }, 1500);
    } else {
        clearInterval(timer);
    }
});

// 点击联动
barChart.on('click', (p) => {
    selectedCountry = p.name;
    updateAll();
});

// 滑动联动
document.getElementById('yearSlider').addEventListener('input', (e) => {
    currentYear = parseInt(e.target.value);
    document.getElementById('yearLabel').innerText = currentYear;
    updateAll();
});
