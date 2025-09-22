NetworkMonitor.Analytics = {
    calculateStats() {
        const websites = NetworkMonitor.state.websites;
        if (websites.length === 0) return { total: 0, online: 0, issues: 0, availability: 0 };
        
        const online = websites.filter(w => w.status === 'online').length;
        const issues = websites.filter(w => ['offline', 'parking', 'invalid', 'error'].includes(w.status)).length;
        
        const totalAvailability = websites.reduce((acc, w) => acc + this.calculateAvailability(w), 0);
        
        return {
            total: websites.length,
            online: online,
            issues: issues,
            availability: Math.round(totalAvailability / websites.length)
        };
    },

    calculateAvailability(website) {
        if (!website.checkHistory || website.checkHistory.length === 0) return 0;
        const onlineChecks = website.checkHistory.filter(c => c.status === 'online').length;
        return Math.round((onlineChecks / website.checkHistory.length) * 100);
    },

    refresh() {
        this.renderAvailabilityChart();
        this.renderResponseTimeChart();
    },

    renderAvailabilityChart() {
        const canvas = document.getElementById('availabilityCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        const range = document.getElementById('analyticsRange')?.value || '7d';
        const { labels, datasets } = this.getChartData('availability', range);

        if (NetworkMonitor.state.charts.availability) {
            NetworkMonitor.state.charts.availability.destroy();
        }

        NetworkMonitor.state.charts.availability = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets },
            options: this.getChartOptions('Overall Website Availability (%)')
        });
    },

    renderResponseTimeChart() {
        const canvas = document.getElementById('responseTimeCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        const range = document.getElementById('analyticsRange')?.value || '7d';
        const { labels, datasets } = this.getChartData('responseTime', range);
        
        if (NetworkMonitor.state.charts.responseTime) {
            NetworkMonitor.state.charts.responseTime.destroy();
        }

        NetworkMonitor.state.charts.responseTime = new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets },
            options: this.getChartOptions('Average Response Time (ms)')
        });
    },

    getChartData(type, range) {
        // This is a mock implementation. A real app would process historical data.
        const labels = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];
        const data = type === 'availability' 
            ? [99.5, 99.8, 99.2, 100, 98.5, 99.9, 100] 
            : [350, 400, 320, 280, 500, 310, 290];
        
        return {
            labels,
            datasets: [{
                label: type === 'availability' ? 'Uptime %' : 'Response Time (ms)',
                data,
                borderColor: 'rgba(79, 70, 229, 1)',
                backgroundColor: 'rgba(79, 70, 229, 0.2)',
                fill: true,
                tension: 0.3
            }]
        };
    },
    
    getChartOptions(title) {
        const isDark = NetworkMonitor.state.darkMode;
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        const textColor = isDark ? '#f1f5f9' : '#334155';
        
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                title: { display: true, text: title, color: textColor, font: { size: 16 } }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: { color: gridColor },
                    ticks: { color: textColor }
                },
                x: {
                    grid: { color: 'transparent' },
                    ticks: { color: textColor }
                }
            }
        };
    },

    generateReport() {
        NetworkMonitor.Utils.Notifications.show('Report generation is a premium feature!', 'info');
    }
};