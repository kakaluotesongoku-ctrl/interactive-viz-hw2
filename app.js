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
    // 【细节 1】获取当年数据后，必须进行降序排列
    // 只有排序后的数据交给 ECharts，它的实时排序动画才会顺滑
    const yearData = rawData
        .filter(d => d.year == currentYear)
        .sort((a, b) => b.emissions - a.emissions)
        .slice(0, 15); // 只取前15名，保证纵轴不拥挤

    const option = {
        title: { text: `🌏 全球人均排放排名 (${currentYear})`, left: 'center' },
        grid: { left: '22%', right: '12%', top: '15%', bottom: '5%' },
        xAxis: { 
            type: 'value', 
            name: 'KG',
            max: 'dataMax', // X轴自动随最大值伸缩
            splitLine: { show: false } 
        },
        yAxis: { 
            type: 'category', 
            data: yearData.map(d => d.country), 
            inverse: true, // 让第一名在最上方
            animationDuration: 300,
            animationDurationUpdate: 300, // 标签切换微调时间
            axisLabel: { 
                fontWeight: 600,
                fontSize: 13
            },
            axisTick: { show: false },
            axisLine: { show: false }
        },
        // 【细节 2】动画时长配置是重中之重
        // animationDurationUpdate 必须略小于定时器的间隔时间
        animationDuration: 0, 
        animationDurationUpdate: 1500, // 丝滑移动的时长
        animationEasing: 'linear',
        animationEasingUpdate: 'linear',

        series: [{
            id: 'bar_series', // 【细节 3】必须给 series 一个固定的 ID
            realtimeSort: true, // 开启实时排序
            type: 'bar',
            // 数据部分必须包含 name 字段作为唯一标识，否则会发生重叠
            data: yearData.map(d => ({
                name: d.country, // 关键：ECharts 靠这个 name 来追踪柱子去向
                value: d.emissions,
                itemStyle: { 
                    color: d.country === selectedCountry ? '#e74c3c' : '#3498db',
                    borderRadius: [0, 5, 5, 0] 
                }
            })),
            label: { 
                show: true, 
                position: 'right', 
                valueAnimation: true, // 数值滚动动画
                fontFamily: 'monospace',
                fontWeight: 'bold'
            }
        }]
    };

    // 【关键修改】setOption 的第二个参数必须为 false 或不传
    // 如果传 true (notMerge)，它会清空画布重画，导致动画消失并产生重叠感
    barChart.setOption(option, false);
}

// 自动播放逻辑优化
document.getElementById('playBtn').onclick = function() {
    isPlaying = !isPlaying;
    this.innerText = isPlaying ? "⏸ 暂停" : "▶ 播放历史";
    
    if(isPlaying) {
        // 定时器设为 2000ms (2秒跳一年)
        // 配合上面代码中的 animationDurationUpdate: 1500ms
        // 留出 500ms 让数据“喘口气”，视觉效果最自然
        timer = setInterval(() => {
            currentYear++;
            if(currentYear > 2021) currentYear = 2014;
            
            updateUI(); // 更新滑块位置
            renderAll(); // 重新渲染
        }, 2000); 
    } else {
        clearInterval(timer);
    }
};

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
