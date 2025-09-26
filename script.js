class MortgageCalculator {
    constructor() {
        this.chart = null;
        this.history = this.loadHistory();
        this.initializeEventListeners();
        this.initializeDisplay();
        this.displayHistory();
    }

    initializeEventListeners() {
        // Add calculate button event listener
        document.getElementById('calculateBtn').addEventListener('click', () => {
            this.calculate();
            this.saveToStorage();
        });
        
        // Auto-save on input changes (but don't calculate)
        const inputs = ['snpPrice', 'loanMargin', 'interestRate', 'loanPeriod', 'extraPayment'];
        inputs.forEach(id => {
            document.getElementById(id).addEventListener('input', () => {
                this.saveToStorage();
            });
        });

        // Clear history button
        document.getElementById('clearHistoryBtn').addEventListener('click', () => {
            this.clearHistory();
        });
    }

    calculate() {
        const snpPrice = parseFloat(document.getElementById('snpPrice').value) || 0;
        const loanMargin = parseFloat(document.getElementById('loanMargin').value) || 0;
        const interestRate = parseFloat(document.getElementById('interestRate').value) || 0;
        const loanPeriod = parseFloat(document.getElementById('loanPeriod').value) || 0;
        const extraPayment = parseFloat(document.getElementById('extraPayment').value) || 0;

        // Calculate loan amount
        const loanAmount = snpPrice * (loanMargin / 100);
        document.getElementById('loanAmount').value = loanAmount;

        if (loanAmount <= 0 || interestRate <= 0 || loanPeriod <= 0) {
            this.updateDisplay(0, 0, 0, 0, 0, []);
            return;
        }

        // Calculate without extra payment
        const monthlyRate = interestRate / 100 / 12;
        const numPayments = loanPeriod * 12;
        const monthlyPayment = this.calculateMonthlyPayment(loanAmount, monthlyRate, numPayments);
        const totalInterest = (monthlyPayment * numPayments) - loanAmount;

        // Calculate with extra payment
        const totalMonthlyPayment = monthlyPayment + extraPayment;
        const payoffData = this.calculatePayoffWithExtra(loanAmount, monthlyRate, totalMonthlyPayment);
        const interestSaving = totalInterest - payoffData.totalInterest;
        const payoffEarlier = this.calculatePayoffEarlier(numPayments, payoffData.numPayments);

        // Update display - show total monthly payment (base + extra)
        this.updateDisplay(
            totalMonthlyPayment, // Show total payment including extra
            payoffData.numPayments,
            payoffData.totalInterest,
            interestSaving,
            payoffEarlier,
            payoffData.paymentBreakdown
        );

        // Update chart
        this.updateChart(payoffData.paymentBreakdown);

        // Save to history
        this.saveToHistory({
            snpPrice,
            loanMargin,
            interestRate,
            loanPeriod,
            extraPayment,
            loanAmount,
            monthlyPayment: totalMonthlyPayment,
            numPayments: payoffData.numPayments,
            totalInterest: payoffData.totalInterest,
            interestSaving,
            payoffEarlier,
            timestamp: new Date().toISOString()
        });
    }

    calculateMonthlyPayment(principal, monthlyRate, numPayments) {
        if (monthlyRate === 0) return principal / numPayments;
        return principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
               (Math.pow(1 + monthlyRate, numPayments) - 1);
    }

    calculatePayoffWithExtra(principal, monthlyRate, monthlyPayment) {
        let balance = principal;
        let totalInterest = 0;
        let paymentBreakdown = [];
        let month = 0;

        while (balance > 0.01 && month < 600) { // Max 50 years
            const interestPayment = balance * monthlyRate;
            const principalPayment = Math.min(monthlyPayment - interestPayment, balance);
            balance -= principalPayment;
            totalInterest += interestPayment;
            
            paymentBreakdown.push({
                month: month + 1,
                principal: principalPayment,
                interest: interestPayment,
                total: principalPayment + interestPayment
            });
            
            month++;
        }

        return {
            numPayments: month,
            totalInterest: totalInterest,
            paymentBreakdown: paymentBreakdown
        };
    }

    calculatePayoffEarlier(originalPayments, newPayments) {
        const monthsEarlier = originalPayments - newPayments;
        const years = Math.floor(monthsEarlier / 12);
        const months = monthsEarlier % 12;
        return { years, months };
    }

    updateDisplay(monthlyPayment, numPayments, totalInterest, interestSaving, payoffEarlier, paymentBreakdown) {
        document.getElementById('monthlyPayment').textContent = `RM ${monthlyPayment.toFixed(2)}`;
        document.getElementById('numPayments').textContent = numPayments;
        document.getElementById('totalInterest').textContent = `RM ${totalInterest.toFixed(2)}`;
        document.getElementById('interestSaving').textContent = `RM ${interestSaving.toFixed(2)}`;
        
        const payoffText = `${payoffEarlier.years} years ${payoffEarlier.months} months`;
        document.getElementById('payoffEarlier').textContent = payoffText;
    }

    // Initialize display with default values
    initializeDisplay() {
        this.updateDisplay(0, 0, 0, 0, {years: 0, months: 0}, []);
    }

    updateChart(paymentBreakdown) {
        const ctx = document.getElementById('paymentChart').getContext('2d');
        
        if (this.chart) {
            this.chart.destroy();
        }

        // Sample data points for chart (every 12 months for better visualization)
        const sampleData = [];
        for (let i = 0; i < paymentBreakdown.length; i += 12) {
            sampleData.push(paymentBreakdown[i]);
        }
        if (paymentBreakdown.length > 0 && sampleData[sampleData.length - 1] !== paymentBreakdown[paymentBreakdown.length - 1]) {
            sampleData.push(paymentBreakdown[paymentBreakdown.length - 1]);
        }

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: sampleData.map(d => `Month ${d.month}`),
                datasets: [
                    {
                        label: 'Principal',
                        data: sampleData.map(d => d.principal),
                        borderColor: '#90EE90',
                        backgroundColor: 'rgba(144, 238, 144, 0.1)',
                        fill: true,
                        tension: 0.1
                    },
                    {
                        label: 'Interest',
                        data: sampleData.map(d => d.interest),
                        borderColor: '#808080',
                        backgroundColor: 'rgba(128, 128, 128, 0.1)',
                        fill: true,
                        tension: 0.1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Payment Amount (RM)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Payment Period'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    saveToStorage() {
        const data = {
            snpPrice: document.getElementById('snpPrice').value,
            loanMargin: document.getElementById('loanMargin').value,
            interestRate: document.getElementById('interestRate').value,
            loanPeriod: document.getElementById('loanPeriod').value,
            extraPayment: document.getElementById('extraPayment').value
        };
        localStorage.setItem('mortgageCalculatorData', JSON.stringify(data));
    }

    // History management methods
    loadHistory() {
        const history = localStorage.getItem('mortgageCalculatorHistory');
        return history ? JSON.parse(history) : [];
    }

    saveToHistory(calculation) {
        // Add to beginning of history (most recent first)
        this.history.unshift(calculation);
        
        // Keep only last 20 calculations to prevent storage bloat
        if (this.history.length > 20) {
            this.history = this.history.slice(0, 20);
        }
        
        // Save to localStorage
        localStorage.setItem('mortgageCalculatorHistory', JSON.stringify(this.history));
        
        // Update display
        this.displayHistory();
    }

    displayHistory() {
        const historyList = document.getElementById('historyList');
        
        if (this.history.length === 0) {
            historyList.innerHTML = '<div class="no-history">No calculations yet. Click "Calculate Loan" to start!</div>';
            return;
        }

        historyList.innerHTML = this.history.map((calc, index) => {
            const date = new Date(calc.timestamp);
            const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
            
            return `
                <div class="history-item">
                    <div class="history-item-header">
                        <div class="history-item-title">Calculation #${index + 1}</div>
                        <div class="history-item-date">${formattedDate}</div>
                    </div>
                    <div class="history-item-details">
                        <div class="history-detail">
                            <span class="history-detail-label">SNP Price:</span>
                            <span class="history-detail-value">RM ${calc.snpPrice.toLocaleString()}</span>
                        </div>
                        <div class="history-detail">
                            <span class="history-detail-label">Loan Amount:</span>
                            <span class="history-detail-value">RM ${calc.loanAmount.toLocaleString()}</span>
                        </div>
                        <div class="history-detail">
                            <span class="history-detail-label">Interest Rate:</span>
                            <span class="history-detail-value">${calc.interestRate}%</span>
                        </div>
                        <div class="history-detail">
                            <span class="history-detail-label">Loan Period:</span>
                            <span class="history-detail-value">${calc.loanPeriod} years</span>
                        </div>
                        <div class="history-detail">
                            <span class="history-detail-label">Extra Payment:</span>
                            <span class="history-detail-value">RM ${calc.extraPayment.toLocaleString()}</span>
                        </div>
                        <div class="history-detail">
                            <span class="history-detail-label">Monthly Payment:</span>
                            <span class="history-detail-value">RM ${calc.monthlyPayment.toFixed(2)}</span>
                        </div>
                        <div class="history-detail">
                            <span class="history-detail-label">Total Interest:</span>
                            <span class="history-detail-value">RM ${calc.totalInterest.toFixed(2)}</span>
                        </div>
                        <div class="history-detail">
                            <span class="history-detail-label">Interest Saving:</span>
                            <span class="history-detail-value">RM ${calc.interestSaving.toFixed(2)}</span>
                        </div>
                        <div class="history-detail">
                            <span class="history-detail-label">Payoff Earlier:</span>
                            <span class="history-detail-value">${calc.payoffEarlier.years}y ${calc.payoffEarlier.months}m</span>
                        </div>
                        <div class="history-detail">
                            <span class="history-detail-label">Total Payments:</span>
                            <span class="history-detail-value">${calc.numPayments}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    clearHistory() {
        if (confirm('Are you sure you want to clear all calculation history?')) {
            this.history = [];
            localStorage.removeItem('mortgageCalculatorHistory');
            this.displayHistory();
        }
    }
}

// Initialize calculator when page loads
document.addEventListener('DOMContentLoaded', () => {
    new MortgageCalculator();
});
