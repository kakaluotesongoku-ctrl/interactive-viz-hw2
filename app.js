let rawData = [];
let currentYear = 2014;
let selectedCountry = "";
let isHypeMode = false; // 欺骗模式开关
let isPlaying = false;
let timer = null;

const barChart = echarts.init(document.getElementById('barChart'));
const lineChart = echarts.init(document.getElementById('lineChart'));

// 1. 数据获取
fetch('./data.json')
    .then(res => res.json())
    .then(data => {
        rawData = data.map(d => ({
            country: d.country || d['Reference area'] || d['REF_AREA'],
            year: parseInt(d.year || d['TIME_PERIOD']),
            emissions: parseFloat(d.emissions || d['OBS_VALUE'])
        }));
        
        const years = [...new Set(rawData.map(d => d.year))].sort();
        currentYear = years[years.length - 1];
        selectedCountry = rawData.filter(d => d.year == currentYear)
                                 .sort((a,b) => b.emissions - a.emissions)[0].country;
        
        updateUI();
        renderAll();
    });

// 2. 核心渲染
function renderAll() {
    renderBarChart();
    renderLineChart();
    renderInsight();
}

function renderBarChart() {
    // 1. 数据处理：过滤当年数据，并进行降序排列
    const yearData = rawData
        .filter(d => d.year == currentYear)
        .sort((a, b) => b.emissions - a.emissions) // 降序排列
        .slice(0, 15); // 取前15名

    const option = {
        title: { text: `🌏 全球排放排名 (${currentYear})`, left: 'center' },
        grid: { left: '20%', right: '12%', top: '15%', bottom: '5%' },
        xAxis: { 
            type: 'value', 
            name: 'KG CO2E', 
            splitLine: { show: false },
            max: 'dataMax' // 让X轴随着最大值自动伸缩，避免柱子超出
        },
        yAxis: { 
            type: 'category', 
            data: yearData.map(d => d.country), 
            inverse: true, // 【关键】让第一名在最上面
            animationDuration: 300,
            animationDurationUpdate: 300,
            axisLabel: { 
                fontWeight: 600,
                interval: 0 // 强制显示所有标签
            }
        },
        // 【关键】全局动画配置，让移动更顺滑
        animationDuration: 0, 
        animationDurationUpdate: 1500, // 动画持续1.5秒
        animationEasing: 'linear',
        animationEasingUpdate: 'linear',
        
        series: [{
            name: 'Emissions',
            type: 'bar',
            realtimeSort: true, // 【关键】开启实时排序
            seriesLayoutBy: 'column',
            data: yearData.map(d => ({
                value: d.emissions,
                name: d.country, // 必须绑定name，ECharts才能识别哪个柱子在“跑”
                itemStyle: { 
                    color: d.country === selectedCountry ? '#e74c3c' : '#3498db',
                    borderRadius: [0, 5, 5, 0] 
                }
            })),
            label: { 
                show: true, 
                position: 'right', 
                valueAnimation: true, // 数值跳动动画
                fontFamily: 'monospace' 
            }
        }]
    };
    
    // 使用 notMerge: false (默认)，这样旧的柱子会平滑移动到新位置
    barChart.setOption(option);
}

// 自动播放逻辑优化
document.getElementById('playBtn').onclick = function() {
    isPlaying = !isPlaying;
    this.innerText = isPlaying ? "⏸ 暂停" : "▶ 自动播放历史";
    
    if(isPlaying) {
        // 定时器设为 2000ms，配合上面 1500ms 的动画，留出 500ms 的停顿感
        timer = setInterval(() => {
            if(currentYear >= 2021) {
                currentYear = 2014; // 循环播放
            } else {
                currentYear++;
            }
            updateUI();
            renderAll();
        }, 2000); 
    } else {
        clearInterval(timer);
    }
}

function renderLineChart() {
    const countryData = rawData.filter(d => d.country === selectedCountry).sort((a,b) => a.year - b.year);
    const years = countryData.map(d => d.year);
    const values = countryData.map(d => d.emissions);
    
    // 【欺骗逻辑实现】
    // 夸大模式下，Y轴不从0开始，而是从最小值的95%开始，夸大波动感
    const yMin = isHypeMode ? Math.min(...values) * 0.98 : 0;
    const yMax = isHypeMode ? Math.max(...values) * 1.02 : Math.max(...values) * 1.2;

    lineChart.setOption({
        title: { 
            text: `📈 ${selectedCountry} 趋势 - ${isHypeMode ? '夸大视角' : '客观视角'}`, 
            left: 'center',
            textStyle: { color: isHypeMode ? '#e74c3c' : '#2d3436' }
        },
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: years },
        yAxis: { 
            type: 'value', 
            min: yMin.toFixed(1), // 截断坐标轴
            max: yMax.toFixed(1),
            name: 'KG CO2E'
        },
        series: [{
            name: selectedCountry,
            type: 'line', smooth: true, data: values,
            lineStyle: { width: 5, color: isHypeMode ? '#e74c3c' : '#3498db' },
            itemStyle: { color: isHypeMode ? '#e74c3c' : '#3498db' },
            areaStyle: { 
                color: isHypeMode ? 'rgba(231, 76, 60, 0.2)' : 'rgba(52, 152, 219, 0.1)'
            },
            markPoint: { data: [{ xAxis: currentYear.toString(), yAxis: countryData.find(d => d.year == currentYear)?.emissions }] }
        }]
    }, true);
}

function renderInsight() {
    const data = rawData.filter(d => d.country === selectedCountry).sort((a,b) => a.year - b.year);
    const change = (((data[data.length-1].emissions - data[0].emissions) / data[0].emissions) * 100).toFixed(1);
    document.getElementById('insightText').innerHTML = isHypeMode ? 
        `⚠️ <strong>警报：</strong> 在夸大模式下，${selectedCountry} 的排放波动看起来极其剧烈！其实际总变动率为 <strong>${change}%</strong>。` :
        `💡 <strong>洞察：</strong> ${selectedCountry} 排放变动率为 <strong>${change}%</strong>。坐标轴从0开始，反映了真实的演变比例。`;
}

// 3. 交互控制
document.getElementById('toggleHype').onclick = function() {
    isHypeMode = true;
    this.classList.add('active');
    document.getElementById('toggleBias').classList.remove('active');
    renderAll();
};

document.getElementById('toggleBias').onclick = function() {
    isHypeMode = false;
    this.classList.add('active');
    document.getElementById('toggleHype').classList.remove('active');
    renderAll();
};

document.getElementById('yearSlider').oninput = function() {
    currentYear = parseInt(this.value);
    document.getElementById('yearLabel').innerText = currentYear;
    renderAll();
};

barChart.on('click', (p) => { selectedCountry = p.name; renderAll(); });

document.getElementById('playBtn').onclick = function() {
    isPlaying = !isPlaying;
    this.innerText = isPlaying ? "⏸ 暂停" : "▶ 自动播放历史";
    if(isPlaying) {
        timer = setInterval(() => {
            currentYear = currentYear >= 2021 ? 2014 : currentYear + 1;
            updateUI();
            renderAll();
        }, 1500);
    } else { clearInterval(timer); }
};

function updateUI() {
    document.getElementById('yearSlider').value = currentYear;
    document.getElementById('yearLabel').innerText = currentYear;
}

window.onresize = () => { barChart.resize(); lineChart.resize(); };
