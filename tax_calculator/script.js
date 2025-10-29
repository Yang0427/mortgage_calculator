class TaxCalculator {
    constructor() {
        this.chart = null;
        this.history = this.loadHistory();
        this.initializeEventListeners();
        this.initializeDisplay();
        this.displayHistory();
    }

    // Malaysian Tax Brackets 2025 (Resident)
    getTaxBrackets() {
        return [
            { min: 0, max: 5000, rate: 0 },
            { min: 5001, max: 20000, rate: 0.01 },
            { min: 20001, max: 35000, rate: 0.03 },
            { min: 35001, max: 50000, rate: 0.08 },
            { min: 50001, max: 70000, rate: 0.13 },
            { min: 70001, max: 100000, rate: 0.21 },
            { min: 100001, max: 250000, rate: 0.24 },
            { min: 250001, max: 400000, rate: 0.245 },
            { min: 400001, max: 600000, rate: 0.25 },
            { min: 600001, max: 1000000, rate: 0.26 },
            { min: 1000001, max: Infinity, rate: 0.28 }
        ];
    }

    initializeEventListeners() {
        // Add calculate button event listener
        const calculateBtn = document.getElementById('calculateTaxBtn');
        if (calculateBtn) {
            calculateBtn.addEventListener('click', () => {
                this.calculate();
                this.saveToStorage();
            });
        }
        
        // Auto-save on input changes
        const inputs = ['basicSalary', 'allowances', 'bonus', 'commission', 'overtime', 'residencyStatus', 
                       'voluntaryEPF', 'prsContribution', 'spouseRelief', 'childrenRelief', 
                       'parentRelief', 'disabledRelief', 'lifestyleRelief', 'lifeInsurance', 
                       'educationFees', 'medicalExpenses', 'zakat', 'charitableDonations'];
        inputs.forEach(id => {
            document.getElementById(id).addEventListener('input', () => {
                this.updateEPFCalculations();
                this.saveToStorage();
            });
        });

        // Clear history button
        document.getElementById('clearHistoryBtn').addEventListener('click', () => {
            this.clearHistory();
        });

        // Clear all fields button
        document.getElementById('clearAllBtn').addEventListener('click', () => {
            this.clearAllInputs();
            this.hideWarnings();
            this.updateDisplay(0, 0, 0, 0, 0, 0, 0);
            this.updateChart(0, 0, 0, 0, 0, 0);
            this.updateTaxBreakdown(0, 0);
        });
    }

    updateEPFCalculations() {
        const basicSalary = parseFloat(document.getElementById('basicSalary').value) || 0;
        const employeeEPF = basicSalary * 0.11;
        const employerEPF = basicSalary * 0.12;
        
        document.getElementById('employeeEPF').value = employeeEPF.toFixed(0);
        document.getElementById('employerEPF').value = employerEPF.toFixed(0);
    }

    calculate() {
        const basicSalary = parseFloat(document.getElementById('basicSalary').value) || 0;
        const allowances = parseFloat(document.getElementById('allowances').value) || 0;
        const bonus = parseFloat(document.getElementById('bonus').value) || 0;
        const commission = parseFloat(document.getElementById('commission').value) || 0;
        const overtime = parseFloat(document.getElementById('overtime').value) || 0;
        const residencyStatus = document.getElementById('residencyStatus').value;
        const voluntaryEPF = parseFloat(document.getElementById('voluntaryEPF').value) || 0;
        const prsContribution = parseFloat(document.getElementById('prsContribution').value) || 0;
        const spouseRelief = parseFloat(document.getElementById('spouseRelief').value) || 0;
        const childrenRelief = parseFloat(document.getElementById('childrenRelief').value) || 0;
        const parentRelief = parseFloat(document.getElementById('parentRelief').value) || 0;
        const disabledRelief = parseFloat(document.getElementById('disabledRelief').value) || 0;
        const lifestyleRelief = parseFloat(document.getElementById('lifestyleRelief').value) || 0;
        const lifeInsurance = parseFloat(document.getElementById('lifeInsurance').value) || 0;
        const educationFees = parseFloat(document.getElementById('educationFees').value) || 0;
        const medicalExpenses = parseFloat(document.getElementById('medicalExpenses').value) || 0;
        const zakat = parseFloat(document.getElementById('zakat').value) || 0;
        const charitableDonations = parseFloat(document.getElementById('charitableDonations').value) || 0;

        // Calculate annual gross income
        const monthlyGross = basicSalary + allowances + commission + overtime;
        const annualGrossIncome = (monthlyGross * 12) + bonus;

        // Calculate EPF contributions
        const employeeEPFAnnual = basicSalary * 0.11 * 12;
        const employerEPFAnnual = basicSalary * 0.12 * 12;
        const voluntaryEPFAnnual = voluntaryEPF * 12;

        // Calculate tax reliefs with proper validations
        const personalRelief = 9000;
        
        // Input validation - prevent negative or unrealistic values
        if (basicSalary < 0 || allowances < 0 || bonus < 0 || commission < 0 || overtime < 0) {
            alert('Please enter valid positive amounts for salary components.');
            return;
        }

        // Upper limit validation for unrealistic values
        if (basicSalary > 100000 || allowances > 50000 || bonus > 500000 || commission > 100000 || overtime > 50000) {
            alert('Please enter realistic salary amounts. If your income is higher, contact a tax advisor.');
            return;
        }
        
        if (spouseRelief < 0 || childrenRelief < 0 || parentRelief < 0 || disabledRelief < 0 || 
            lifestyleRelief < 0 || lifeInsurance < 0 || educationFees < 0 || medicalExpenses < 0 ||
            zakat < 0 || charitableDonations < 0) {
            alert('Please enter valid positive amounts for tax reliefs.');
            return;
        }

        // Validate and cap reliefs according to Malaysian tax rules
        const validatedChildrenRelief = Math.min(Math.max(childrenRelief, 0), 12000); // Max RM12,000 (6 children × RM2,000)
        const validatedParentRelief = Math.min(Math.max(parentRelief, 0), 3000); // Max RM3,000 (2 parents × RM1,500)
        const validatedLifestyleRelief = Math.min(Math.max(lifestyleRelief, 0), 2500); // Max RM2,500
        const validatedEducationFees = Math.min(Math.max(educationFees, 0), 7000); // Max RM7,000
        const validatedMedicalExpenses = Math.min(Math.max(medicalExpenses, 0), 5000); // Max RM5,000 for parents
        const validatedDisabledRelief = Math.max(disabledRelief, 0); // No cap, but must be positive
        const validatedSpouseRelief = Math.max(spouseRelief, 0); // No cap, but must be positive
        const totalVoluntaryContributions = Math.min(voluntaryEPFAnnual + prsContribution + lifeInsurance, 7000);

        // Show warnings for capped reliefs
        let warnings = [];
        if (childrenRelief > 12000) warnings.push('Children relief capped at RM12,000 (6 children × RM2,000)');
        if (parentRelief > 3000) warnings.push('Parent relief capped at RM3,000 (2 parents × RM1,500)');
        if (lifestyleRelief > 2500) warnings.push('Lifestyle relief capped at RM2,500');
        if (educationFees > 7000) warnings.push('Education fees relief capped at RM7,000');
        if (medicalExpenses > 5000) warnings.push('Medical expenses relief capped at RM5,000');
        if ((voluntaryEPFAnnual + prsContribution + lifeInsurance) > 7000) {
            warnings.push('Voluntary contributions (EPF + PRS + Life Insurance) capped at RM7,000');
        }
        
        if (warnings.length > 0) {
            console.warn('Tax Relief Caps Applied:', warnings.join('; '));
            this.displayWarnings(warnings);
        } else {
            this.hideWarnings();
        }
        
        const totalTaxReliefs = personalRelief + validatedSpouseRelief + validatedChildrenRelief + 
                               validatedParentRelief + validatedDisabledRelief + validatedLifestyleRelief +
                               totalVoluntaryContributions + validatedEducationFees + validatedMedicalExpenses +
                               zakat + charitableDonations;

        // Calculate chargeable income
        const chargeableIncome = Math.max(0, annualGrossIncome - totalTaxReliefs);

        // Calculate tax
        let annualTax = 0;
        if (residencyStatus === 'non-resident') {
            // Non-residents pay flat 30% on employment income
            annualTax = annualGrossIncome * 0.30;
        } else {
            // Progressive tax for residents
            annualTax = this.calculateProgressiveTax(chargeableIncome);
        }

        // Round tax to nearest RM (LHDN standard)
        annualTax = Math.round(annualTax);

        // Calculate monthly tax (MTD) - also rounded
        const monthlyTax = Math.round(annualTax / 12);

        // Calculate take-home pay
        const monthlyEmployeeEPF = basicSalary * 0.11;
        const takeHomePay = monthlyGross - monthlyEmployeeEPF - voluntaryEPF - monthlyTax;

        // Calculate total EPF contribution
        const totalEPFContribution = employeeEPFAnnual + employerEPFAnnual + voluntaryEPFAnnual;

        // Update display
        this.updateDisplay(annualGrossIncome, totalTaxReliefs, chargeableIncome, 
                         annualTax, monthlyTax, takeHomePay, totalEPFContribution);

        // Update chart
        this.updateChart(annualGrossIncome, totalTaxReliefs, annualTax, 
                        employeeEPFAnnual, employerEPFAnnual, voluntaryEPFAnnual);

        // Update tax breakdown
        this.updateTaxBreakdown(chargeableIncome, annualTax);

        // Save to history
        this.saveToHistory({
            basicSalary,
            allowances,
            bonus,
            commission,
            overtime,
            residencyStatus,
            voluntaryEPF,
            prsContribution,
            spouseRelief,
            childrenRelief,
            parentRelief,
            disabledRelief,
            lifestyleRelief,
            lifeInsurance,
            educationFees,
            medicalExpenses,
            zakat,
            charitableDonations,
            annualGrossIncome,
            totalTaxReliefs,
            chargeableIncome,
            annualTax,
            monthlyTax,
            takeHomePay,
            totalEPFContribution,
            timestamp: new Date().toISOString()
        });
    }

    calculateProgressiveTax(chargeableIncome) {
        const brackets = this.getTaxBrackets();
        let tax = 0;
        let remainingIncome = chargeableIncome;

        for (const bracket of brackets) {
            if (remainingIncome <= 0) break;
            
            const taxableInBracket = Math.min(remainingIncome, bracket.max - bracket.min + 1);
            tax += taxableInBracket * bracket.rate;
            remainingIncome -= taxableInBracket;
        }

        return tax;
    }

    updateDisplay(annualGrossIncome, totalTaxReliefs, chargeableIncome, 
                 annualTax, monthlyTax, takeHomePay, totalEPFContribution) {
        document.getElementById('annualGrossIncome').textContent = `RM ${annualGrossIncome.toLocaleString()}`;
        document.getElementById('totalTaxReliefs').textContent = `RM ${totalTaxReliefs.toLocaleString()}`;
        document.getElementById('chargeableIncome').textContent = `RM ${chargeableIncome.toLocaleString()}`;
        document.getElementById('annualTax').textContent = `RM ${annualTax.toFixed(2)}`;
        document.getElementById('monthlyTax').textContent = `RM ${monthlyTax.toFixed(2)}`;
        document.getElementById('takeHomePay').textContent = `RM ${takeHomePay.toFixed(2)}`;
        document.getElementById('totalEPFContribution').textContent = `RM ${totalEPFContribution.toLocaleString()}`;
    }

    // Initialize display with default values
    initializeDisplay() {
        this.updateEPFCalculations();
        this.updateDisplay(0, 0, 0, 0, 0, 0, 0);
        this.updateChart(0, 0, 0, 0, 0, 0);
        this.clearAllInputs(); // Clear all inputs to remove any default values
    }

    // Clear all input fields to ensure no default values
    clearAllInputs() {
        const inputFields = [
            'basicSalary', 'allowances', 'bonus', 'commission', 'overtime',
            'voluntaryEPF', 'prsContribution', 'spouseRelief', 'childrenRelief',
            'parentRelief', 'disabledRelief', 'lifestyleRelief', 'lifeInsurance',
            'educationFees', 'medicalExpenses', 'zakat', 'charitableDonations'
        ];
        
        inputFields.forEach(fieldId => {
            const element = document.getElementById(fieldId);
            if (element) {
                element.value = '';
            }
        });
        
        // Clear any stored data
        localStorage.removeItem('taxCalculatorData');
    }

    updateChart(annualGrossIncome, totalTaxReliefs, annualTax, 
               employeeEPFAnnual, employerEPFAnnual, voluntaryEPFAnnual) {
        const ctx = document.getElementById('taxChart').getContext('2d');
        
        if (this.chart) {
            this.chart.destroy();
        }

        // Handle empty data
        if (annualGrossIncome === 0) {
            this.chart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['No Data'],
                    datasets: [{
                        data: [1],
                        backgroundColor: ['#e9ecef'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Click "Calculate Tax" to see breakdown'
                        }
                    }
                }
            });
            return;
        }

        // Calculate net income after tax and EPF
        const netIncome = annualGrossIncome - annualTax - employeeEPFAnnual - voluntaryEPFAnnual;

        this.chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: [
                    'Net Income',
                    'Income Tax',
                    'Employee EPF',
                    'Employer EPF',
                    'Voluntary EPF'
                ],
                datasets: [{
                    data: [
                        netIncome,
                        annualTax,
                        employeeEPFAnnual,
                        employerEPFAnnual,
                        voluntaryEPFAnnual
                    ],
                    backgroundColor: [
                        '#90EE90',  // Net Income - Light Green
                        '#FF6B6B',  // Tax - Red
                        '#4ECDC4',  // Employee EPF - Teal
                        '#45B7D1',  // Employer EPF - Blue
                        '#96CEB4'   // Voluntary EPF - Light Green
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Annual Income Breakdown',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed;
                                return `${label}: RM ${value.toLocaleString()}`;
                            }
                        }
                    }
                }
            }
        });
    }

    saveToStorage() {
        const data = {
            basicSalary: document.getElementById('basicSalary').value,
            allowances: document.getElementById('allowances').value,
            bonus: document.getElementById('bonus').value,
            commission: document.getElementById('commission').value,
            residencyStatus: document.getElementById('residencyStatus').value,
            voluntaryEPF: document.getElementById('voluntaryEPF').value,
            prsContribution: document.getElementById('prsContribution').value,
            spouseRelief: document.getElementById('spouseRelief').value,
            childrenRelief: document.getElementById('childrenRelief').value,
            lifeInsurance: document.getElementById('lifeInsurance').value,
            educationFees: document.getElementById('educationFees').value,
            medicalExpenses: document.getElementById('medicalExpenses').value
        };
        localStorage.setItem('taxCalculatorData', JSON.stringify(data));
    }

    // History management methods
    loadHistory() {
        const history = localStorage.getItem('taxCalculatorHistory');
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
        localStorage.setItem('taxCalculatorHistory', JSON.stringify(this.history));
        
        // Update display
        this.displayHistory();
    }

    displayHistory() {
        const historyList = document.getElementById('historyList');
        
        if (this.history.length === 0) {
            historyList.innerHTML = '<div class="no-history">No calculations yet. Click "Calculate Tax" to start!</div>';
            return;
        }

        historyList.innerHTML = this.history.map((calc, index) => {
            const date = new Date(calc.timestamp);
            const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
            
            return '<div class="history-item">' +
                '<div class="history-item-header">' +
                    '<div class="history-item-title">Tax Calculation #' + (index + 1) + '</div>' +
                    '<div class="history-item-date">' + formattedDate + '</div>' +
                '</div>' +
                '<div class="history-item-details">' +
                    '<div class="history-detail">' +
                        '<span class="history-detail-label">Basic Salary:</span>' +
                        '<span class="history-detail-value">RM ' + calc.basicSalary.toLocaleString() + '/month</span>' +
                    '</div>' +
                    '<div class="history-detail">' +
                        '<span class="history-detail-label">Annual Gross:</span>' +
                        '<span class="history-detail-value">RM ' + calc.annualGrossIncome.toLocaleString() + '</span>' +
                    '</div>' +
                    '<div class="history-detail">' +
                        '<span class="history-detail-label">Chargeable Income:</span>' +
                        '<span class="history-detail-value">RM ' + calc.chargeableIncome.toLocaleString() + '</span>' +
                    '</div>' +
                    '<div class="history-detail">' +
                        '<span class="history-detail-label">Annual Tax:</span>' +
                        '<span class="history-detail-value">RM ' + calc.annualTax.toFixed(2) + '</span>' +
                    '</div>' +
                    '<div class="history-detail">' +
                        '<span class="history-detail-label">Monthly Tax:</span>' +
                        '<span class="history-detail-value">RM ' + calc.monthlyTax.toFixed(2) + '</span>' +
                    '</div>' +
                    '<div class="history-detail">' +
                        '<span class="history-detail-label">Take-Home Pay:</span>' +
                        '<span class="history-detail-value">RM ' + calc.takeHomePay.toFixed(2) + '/month</span>' +
                    '</div>' +
                    '<div class="history-detail">' +
                        '<span class="history-detail-label">Total EPF:</span>' +
                        '<span class="history-detail-value">RM ' + calc.totalEPFContribution.toLocaleString() + '/year</span>' +
                    '</div>' +
                    '<div class="history-detail">' +
                        '<span class="history-detail-label">Residency:</span>' +
                        '<span class="history-detail-value">' + (calc.residencyStatus === 'resident' ? 'Resident' : 'Non-Resident') + '</span>' +
                    '</div>' +
                '</div>' +
            '</div>';
        }).join('');
    }

    clearHistory() {
        if (confirm('Are you sure you want to clear all calculation history?')) {
            this.history = [];
            localStorage.removeItem('taxCalculatorHistory');
            this.displayHistory();
        }
    }

    // Display relief cap warnings in UI
    displayWarnings(warnings) {
        const warningsContainer = document.getElementById('reliefWarnings');
        const warningList = document.getElementById('warningList');
        
        warningList.innerHTML = warnings.map(warning => 
            `<div class="warning-item">• ${warning}</div>`
        ).join('');
        
        warningsContainer.style.display = 'block';
    }

    // Hide relief cap warnings
    hideWarnings() {
        const warningsContainer = document.getElementById('reliefWarnings');
        warningsContainer.style.display = 'none';
    }

    // Update detailed tax breakdown
    updateTaxBreakdown(chargeableIncome, annualTax) {
        const breakdownList = document.getElementById('breakdownList');
        
        if (chargeableIncome <= 0) {
            breakdownList.innerHTML = '<div class="no-breakdown">No tax payable</div>';
            return;
        }

        const brackets = this.getTaxBrackets();
        let remainingIncome = chargeableIncome;
        let totalTax = 0;
        let breakdownHTML = '';

        for (const bracket of brackets) {
            if (remainingIncome <= 0) break;
            
            const taxableInBracket = Math.min(remainingIncome, bracket.max - bracket.min + 1);
            const taxInBracket = taxableInBracket * bracket.rate;
            totalTax += taxInBracket;
            remainingIncome -= taxableInBracket;

            if (taxableInBracket > 0) {
                const bracketLabel = bracket.max === Infinity ? 
                    `Above RM${bracket.min.toLocaleString()}` : 
                    `RM${bracket.min.toLocaleString()} - RM${bracket.max.toLocaleString()}`;
                
                breakdownHTML += `
                    <div class="breakdown-item">
                        <div class="breakdown-bracket">${bracketLabel}</div>
                        <div class="breakdown-amount">RM${taxableInBracket.toLocaleString()}</div>
                        <div class="breakdown-rate">${(bracket.rate * 100).toFixed(1)}%</div>
                        <div class="breakdown-tax">RM${taxInBracket.toFixed(2)}</div>
                    </div>
                `;
            }
        }

        breakdownHTML += `
            <div class="breakdown-total">
                <div class="breakdown-bracket"><strong>Total Tax</strong></div>
                <div class="breakdown-amount"></div>
                <div class="breakdown-rate"></div>
                <div class="breakdown-tax"><strong>RM${totalTax.toFixed(2)}</strong></div>
            </div>
        `;

        breakdownList.innerHTML = breakdownHTML;
    }
}

// Initialize calculator when page loads
document.addEventListener('DOMContentLoaded', () => {
    new TaxCalculator();
});
