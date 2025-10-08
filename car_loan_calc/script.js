class CarAffordabilityCalculator {
    constructor() {
        this.chart = null;
        this.history = this.loadHistory();
        this.initializeEventListeners();
        this.initializeDisplay();
        this.displayHistory();
    }

    // Malaysian car segment data with FINAL REALISTIC insurance rates (professional market rates)
    carSegmentData = {
        'A': {
            name: 'A Segment (Perodua, Proton)',
            insuranceRate: 0.027, // 2.7% - Final recommended rate
            servicingRate: 0.015,
            fuelEfficiency: 15,
            minorService: 200,
            majorService: 800
        },
        'B': {
            name: 'B Segment (Honda City, Toyota Vios)',
            insuranceRate: 0.028, // 2.8% - Final recommended rate
            servicingRate: 0.018,
            fuelEfficiency: 14,
            minorService: 300,
            majorService: 1200
        },
        'C': {
            name: 'C Segment (Honda Civic, Toyota Corolla)',
            insuranceRate: 0.030, // 3.0% - Final recommended rate
            servicingRate: 0.02,
            fuelEfficiency: 13,
            minorService: 400,
            majorService: 1500
        },
        'D': {
            name: 'D Segment (Honda Accord, Toyota Camry, 3-Series)',
            insuranceRate: 0.031, // 3.1% - Final recommended rate
            servicingRate: 0.025,
            fuelEfficiency: 12,
            minorService: 600,
            majorService: 2000
        },
        'E': {
            name: 'E Segment (BMW 5 Series, Mercedes E-Class)',
            insuranceRate: 0.033, // 3.3% - Final recommended rate
            servicingRate: 0.03,
            fuelEfficiency: 11,
            minorService: 800,
            majorService: 3000
        },
        'F': {
            name: 'F Segment (Bentley, Rolls-Royce, S-Class, 7 Series)',
            insuranceRate: 0.036, // 3.6% - Final recommended rate
            servicingRate: 0.035,
            fuelEfficiency: 10,
            minorService: 1200,
            majorService: 4000
        },
        'Supercar': {
            name: 'Supercar (Lamborghini, Ferrari)',
            insuranceRate: 0.040, // 4.0% - Final recommended rate (3.8-4.2% range)
            servicingRate: 0.05,
            fuelEfficiency: 8,
            minorService: 2000,
            majorService: 8000
        }
    };

    // Malaysian Road Tax Calculation based on CC with Progressive Rates
    calculateRoadTax(cc) {
        if (cc <= 1000) return 20;
        if (cc <= 1200) return 55;
        if (cc <= 1400) return 70;
        if (cc <= 1600) return 90;
        
        // Progressive rates
        if (cc <= 1800) {
            return 200 + (cc - 1600) * 0.40; // RM 0.40 per cc above 1,600 cc
        }
        if (cc <= 2000) {
            return 280 + (cc - 1800) * 0.50; // RM 0.50 per cc above 1,800 cc
        }
        if (cc <= 2500) {
            return 380 + (cc - 2000) * 1.00; // RM 1.00 per cc above 2,000 cc
        }
        if (cc <= 3000) {
            return 880 + (cc - 2500) * 2.50; // RM 2.50 per cc above 2,500 cc
        }
        
        // 3001cc and above
        return 2130 + (cc - 3000) * 4.50; // RM 4.50 per cc above 3,000 cc
    }

    // Get realistic fuel efficiency based on body type
    getFuelEfficiency(baseEfficiency, bodyType) {
        let efficiency = baseEfficiency;
        
        switch(bodyType) {
            case 'suv':
                efficiency = baseEfficiency * 0.75; // SUVs are 25% less efficient
                break;
            case 'mpv':
                efficiency = baseEfficiency * 0.80; // MPVs are 20% less efficient
                break;
            case 'pickup':
                efficiency = baseEfficiency * 0.85; // Pickups are 15% less efficient
                break;
            case 'sedan':
            case 'coupe':
            default:
                efficiency = baseEfficiency; // Sedans and coupes use base efficiency
                break;
        }
        
        return Math.max(efficiency, 6); // Minimum 6 km/L for any vehicle
    }

    // Auto-calculate down payment amount when percentage changes
    updateDownPaymentAmount() {
        const carPrice = parseFloat(document.getElementById('carPrice').value) || 0;
        const downPaymentPercent = parseFloat(document.getElementById('downPaymentPercent').value) || 0;
        const downPaymentAmount = carPrice * (downPaymentPercent / 100);
        document.getElementById('downPaymentAmount').value = downPaymentAmount;
    }

    // Toggle loan fields visibility
    toggleLoanFields(show) {
        const loanFields = document.getElementById('loanFields');
        if (show) {
            loanFields.classList.remove('hidden');
        } else {
            loanFields.classList.add('hidden');
        }
    }

    // CORRECTED Malaysian Insurance Calculation (Industry-Compliant)
    calculateInsurance(carPrice, carSegment) {
        const segmentData = this.carSegmentData[carSegment];
        const driverAge = document.getElementById('driverAge').value;
        const ncd = parseFloat(document.getElementById('ncd').value) || 0;
        const coverageType = document.getElementById('coverageType').value;
        const location = document.getElementById('location').value;
        const vehicleAge = parseInt(document.getElementById('vehicleAge').value) || 0;
        const vehicleBodyType = document.getElementById('vehicleBodyType').value;
        const ownershipType = document.getElementById('ownershipType').value;
        const includeFloodCoverage = document.getElementById('includeFloodCoverage').checked;
        const includeWindscreen = document.getElementById('includeWindscreen').checked;

        // Product configuration (should be configurable per product)
        const productConfig = {
            minPremium: 263.13, // Should be product-specific from PDS
            stampDuty: 10,
            serviceTaxRate: 0.08 // 8% service tax (updated 2024)
        };

        // 1. Calculate Sum Insured (depreciated market value - 4% per year, cap 10 years)
        let sumInsured = carPrice * (1 - Math.min(vehicleAge, 10) * 0.04);
        if (sumInsured < carPrice * 0.6) sumInsured = carPrice * 0.6; // Minimum 60% of original value

        // 2. Split premium into Own Damage (OD) and Third Party (TP) components
        let odPremium = sumInsured * segmentData.insuranceRate; // OD base rate
        let tpPremium = 0; // TP/TPFT rate (typically much lower, often 0.1-0.3%)
        
        // For now, using simplified TP rate - should be in segmentData
        if (coverageType === 'comprehensive') {
            tpPremium = carPrice * 0.002; // 0.2% TP rate for comprehensive
        } else if (coverageType === 'thirdparty') {
            tpPremium = carPrice * 0.001; // 0.1% TP rate for third party only
            odPremium = 0; // No OD coverage for third party
        }

        // 3. Apply loadings to OD portion only (not TP)
        if (odPremium > 0) {
            // Driver age factor
            if (driverAge === 'under25') {
                odPremium *= 1.20; // +20% loading for under 25
            } else if (driverAge === 'above60') {
                odPremium *= 1.10; // +10% loading for over 60
            }

            // Regional loading factor
            let locationFactor = 1.0;
            switch(location) {
                case 'kl': locationFactor = 1.05; break;      // +5% KL/Selangor
                case 'johor': locationFactor = 1.04; break;   // +4% Johor
                case 'penang': locationFactor = 1.03; break;  // +3% Penang
                case 'sabah': locationFactor = 0.95; break;   // -5% Sabah
                case 'sarawak': locationFactor = 0.95; break; // -5% Sarawak
                case 'langkawi': locationFactor = 1.0; break; // Standard Langkawi
                default: locationFactor = 1.0; break;         // Standard rate
            }
            odPremium *= locationFactor;

            // Vehicle body type factor
            let bodyTypeFactor = 1.0;
            switch(vehicleBodyType) {
                case 'suv': bodyTypeFactor = 1.10; break;     // +10% SUV
                case 'mpv': bodyTypeFactor = 1.10; break;    // +10% MPV
                case 'pickup': bodyTypeFactor = 1.05; break; // +5% Pickup
                case 'sedan': case 'coupe': 
                default: bodyTypeFactor = 1.0; break;        // Standard rate
            }
            odPremium *= bodyTypeFactor;

            // Ownership type factor
            let ownershipFactor = 1.0;
            if (ownershipType === 'company') {
                ownershipFactor = 1.20; // +20% for company/commercial
            }
            odPremium *= ownershipFactor;
        }

        // 4. Add-on coverages (only for comprehensive, excluded from NCD)
        let addOnPremium = 0;
        if (coverageType === 'comprehensive') {
            if (includeFloodCoverage) {
                addOnPremium += sumInsured * 0.0025; // 0.25% of sum insured for flood coverage
            }

            if (includeWindscreen) {
                const windscreenValue = Math.min(sumInsured * 0.02, 2000); // 2% of sum insured, max RM2,000
                addOnPremium += windscreenValue * 0.15; // 15% of windscreen value
            }
        }

        // 5. Apply NCD ONLY to OD portion (correct industry practice)
        let cappedNcd = Math.min(ncd, 55); // Cap NCD at 55%
        let odAfterNcd = odPremium * (1 - cappedNcd / 100);

        // 6. Compose final premium (pre-tax)
        let finalBeforeTax = odAfterNcd + tpPremium + addOnPremium;

        // 7. Minimum premium rule (product-specific)
        if (finalBeforeTax < productConfig.minPremium) {
            finalBeforeTax = productConfig.minPremium;
        }

        // 8. Add taxes (mandatory in Malaysia)
        const serviceTax = finalBeforeTax * productConfig.serviceTaxRate;
        const stampDuty = productConfig.stampDuty;
        const finalPayable = finalBeforeTax + serviceTax + stampDuty;

        // Store breakdown for display/debugging
        this.lastInsuranceBreakdown = {
            sumInsured,
            odPremiumBeforeNcd: odPremium,
            odAfterNcd,
            tpPremium,
            addOnPremium,
            finalBeforeTax,
            serviceTax,
            stampDuty,
            finalPayable
        };

        return finalPayable;
    }

    // Display detailed insurance breakdown (for transparency)
    displayInsuranceBreakdown() {
        if (!this.lastInsuranceBreakdown) return;
        
        const breakdown = this.lastInsuranceBreakdown;
        console.log('Insurance Breakdown:', {
            'Sum Insured': `RM ${breakdown.sumInsured.toLocaleString()}`,
            'OD Premium (before NCD)': `RM ${breakdown.odPremiumBeforeNcd.toFixed(2)}`,
            'OD Premium (after NCD)': `RM ${breakdown.odAfterNcd.toFixed(2)}`,
            'Third Party Premium': `RM ${breakdown.tpPremium.toFixed(2)}`,
            'Add-ons Premium': `RM ${breakdown.addOnPremium.toFixed(2)}`,
            'Subtotal (before tax)': `RM ${breakdown.finalBeforeTax.toFixed(2)}`,
            'Service Tax (8%)': `RM ${breakdown.serviceTax.toFixed(2)}`,
            'Stamp Duty': `RM ${breakdown.stampDuty.toFixed(2)}`,
            'Total Payable': `RM ${breakdown.finalPayable.toFixed(2)}`
        });
    }

    initializeEventListeners() {
        // Calculate button
        const calculateBtn = document.getElementById('calculateCarBtn');
        if (calculateBtn) {
            calculateBtn.addEventListener('click', () => {
                this.calculate();
                this.saveToHistory();
            });
        }
        
        // Auto-save on input changes (including new insurance fields)
        const inputs = ['carSegment', 'carPrice', 'carInterestRate', 'carLoanPeriod', 'engineCC', 'vehicleBodyType', 'ownershipType', 'monthlyMileage', 'vehicleAge', 'driverAge', 'ncd', 'coverageType', 'location', 'includeFloodCoverage', 'includeWindscreen'];
        inputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', () => {
                    this.saveToStorage();
                });
                // For checkboxes, also listen to change event
                if (element.type === 'checkbox') {
                    element.addEventListener('change', () => {
                        this.saveToStorage();
                    });
                }
            }
        });

        // Auto-calculate down payment amount when car price or percentage changes
        document.getElementById('carPrice').addEventListener('input', () => {
            this.updateDownPaymentAmount();
            this.saveToStorage();
        });

        document.getElementById('downPaymentPercent').addEventListener('input', () => {
            this.updateDownPaymentAmount();
            this.saveToStorage();
        });

        // Purchase type radio button handlers
        document.getElementById('loanPurchase').addEventListener('change', () => {
            this.toggleLoanFields(true);
            this.saveToStorage();
        });

        document.getElementById('cashPurchase').addEventListener('change', () => {
            this.toggleLoanFields(false);
            this.saveToStorage();
        });

        // Clear history button
        document.getElementById('clearHistoryBtn').addEventListener('click', () => {
            this.clearHistory();
        });
    }

    // Validation function
    validateInputs() {
        const purchaseType = document.querySelector('input[name="purchaseType"]:checked').value;
        const monthlyMileage = parseFloat(document.getElementById('monthlyMileage').value) || 0;

        // Common validation
        if (monthlyMileage > 1000) {
            alert('Monthly mileage cannot exceed 1000 km');
            return false;
        }

        // Loan-specific validation
        if (purchaseType === 'loan') {
            const downPaymentPercent = parseFloat(document.getElementById('downPaymentPercent').value) || 0;
            const interestRate = parseFloat(document.getElementById('carInterestRate').value) || 0;
            const loanPeriod = parseFloat(document.getElementById('carLoanPeriod').value) || 0;

            if (downPaymentPercent < 10 || downPaymentPercent > 100) {
                alert('Down payment percentage must be between 10% and 100%');
                return false;
            }
            if (interestRate > 10) {
                alert('Interest rate cannot exceed 10%');
                return false;
            }
            if (loanPeriod > 9) {
                alert('Loan period cannot exceed 9 years');
                return false;
            }
        }
        return true;
    }

    calculate() {
        // Validate inputs first
        if (!this.validateInputs()) {
            return;
        }

        const carPrice = parseFloat(document.getElementById('carPrice').value) || 0;
        const purchaseType = document.querySelector('input[name="purchaseType"]:checked').value;
        const monthlyMileage = parseFloat(document.getElementById('monthlyMileage').value) || 0;
        const carSegment = document.getElementById('carSegment').value;
        const engineCC = parseInt(document.getElementById('engineCC').value) || 1000;

        // Calculate loan details based on purchase type
        let monthlyLoanPayment = 0;
        let downPayment = 0;
        let loanAmount = 0;

        if (purchaseType === 'loan') {
            const downPaymentPercent = parseFloat(document.getElementById('downPaymentPercent').value) || 0;
            const interestRate = parseFloat(document.getElementById('carInterestRate').value) || 0;
            const loanPeriod = parseFloat(document.getElementById('carLoanPeriod').value) || 0;
            
            downPayment = carPrice * (downPaymentPercent / 100);
            loanAmount = carPrice - downPayment;
            
            if (loanAmount > 0 && interestRate > 0 && loanPeriod > 0) {
                const monthlyRate = interestRate / 100 / 12;
                const totalPayments = loanPeriod * 12;
                monthlyLoanPayment = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) / 
                                    (Math.pow(1 + monthlyRate, totalPayments) - 1);
            }
        } else {
            // Cash purchase - full payment upfront
            downPayment = carPrice;
            loanAmount = 0;
            monthlyLoanPayment = 0;
        }

        // Get segment data
        const segmentData = this.carSegmentData[carSegment];

        // Calculate other costs using REAL Malaysian rates
        const annualInsurance = this.calculateInsurance(carPrice, carSegment);
        const monthlyInsurance = annualInsurance / 12;
        
        // Display detailed breakdown for transparency
        this.displayInsuranceBreakdown();
        const annualRoadTax = this.calculateRoadTax(engineCC);
        const monthlyRoadTax = annualRoadTax / 12;
        const monthlyServicing = (carPrice * segmentData.servicingRate) / 12;

        // Calculate fuel cost with realistic body type efficiency
        const fuelPricePerLiter = 2.50;
        const vehicleBodyType = document.getElementById('vehicleBodyType').value;
        const fuelEfficiency = this.getFuelEfficiency(segmentData.fuelEfficiency, vehicleBodyType);
        const monthlyFuel = (monthlyMileage / fuelEfficiency) * fuelPricePerLiter;

        const totalMonthlyCost = monthlyLoanPayment + monthlyInsurance + monthlyRoadTax + 
                               monthlyServicing + monthlyFuel;

        // Update display
        this.updateDisplay(monthlyLoanPayment, monthlyInsurance, monthlyRoadTax, 
                          monthlyServicing, monthlyFuel, totalMonthlyCost);

        // Update chart
        this.updateChart([
            { label: 'Loan Payment', value: monthlyLoanPayment, color: '#2d5a27' },
            { label: 'Insurance', value: monthlyInsurance, color: '#4a90e2' },
            { label: 'Road Tax', value: monthlyRoadTax, color: '#f39c12' },
            { label: 'Servicing', value: monthlyServicing, color: '#e74c3c' },
            { label: 'Fuel', value: monthlyFuel, color: '#9b59b6' }
        ]);
    }

    updateDisplay(loanPayment, insurance, roadTax, servicing, fuel, total) {
        document.getElementById('monthlyLoanPayment').textContent = `RM ${loanPayment.toFixed(2)}`;
        document.getElementById('monthlyInsurance').textContent = `RM ${insurance.toFixed(2)}`;
        document.getElementById('monthlyRoadTax').textContent = `RM ${roadTax.toFixed(2)}`;
        document.getElementById('monthlyServicing').textContent = `RM ${servicing.toFixed(2)}`;
        document.getElementById('monthlyFuel').textContent = `RM ${fuel.toFixed(2)}`;
        document.getElementById('totalMonthlyCost').textContent = `RM ${total.toFixed(2)}`;
    }

    updateChart(costBreakdown) {
        const ctx = document.getElementById('costChart').getContext('2d');
        
        if (this.chart) {
            this.chart.destroy();
        }

        this.chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: costBreakdown.map(item => item.label),
                datasets: [{
                    data: costBreakdown.map(item => item.value),
                    backgroundColor: costBreakdown.map(item => item.color),
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
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
                                return `${context.label}: RM ${context.parsed.toFixed(2)}`;
                            }
                        }
                    }
                }
            }
        });
    }

    saveToHistory() {
        const carPrice = parseFloat(document.getElementById('carPrice').value) || 0;
        const downPaymentPercent = parseFloat(document.getElementById('downPaymentPercent').value) || 0;
        const downPayment = carPrice * (downPaymentPercent / 100);
        const interestRate = parseFloat(document.getElementById('carInterestRate').value) || 0;
        const loanPeriod = parseFloat(document.getElementById('carLoanPeriod').value) || 0;
        const monthlyMileage = parseFloat(document.getElementById('monthlyMileage').value) || 0;
        const carSegment = document.getElementById('carSegment').value;
        const engineCC = parseInt(document.getElementById('engineCC').value) || 1000;
        
        // Enhanced insurance details
        const vehicleAge = parseInt(document.getElementById('vehicleAge').value) || 0;
        const driverAge = document.getElementById('driverAge').value;
        const ncd = parseFloat(document.getElementById('ncd').value) || 0;
        const coverageType = document.getElementById('coverageType').value;
        const location = document.getElementById('location').value;
        const vehicleBodyType = document.getElementById('vehicleBodyType').value;
        const ownershipType = document.getElementById('ownershipType').value;
        const includeFloodCoverage = document.getElementById('includeFloodCoverage').checked;
        const includeWindscreen = document.getElementById('includeWindscreen').checked;

        const calculation = {
            id: Date.now(),
            timestamp: new Date().toLocaleString('en-MY'),
            carSegment: carSegment,
            carPrice: carPrice,
            downPaymentPercent: downPaymentPercent,
            downPayment: downPayment,
            loanAmount: carPrice - downPayment,
            interestRate: interestRate,
            loanPeriod: loanPeriod,
            engineCC: engineCC,
            monthlyMileage: monthlyMileage,
            // Enhanced insurance details
            vehicleAge: vehicleAge,
            driverAge: driverAge,
            ncd: ncd,
            coverageType: coverageType,
            location: location,
            vehicleBodyType: vehicleBodyType,
            ownershipType: ownershipType,
            includeFloodCoverage: includeFloodCoverage,
            includeWindscreen: includeWindscreen,
            // Cost breakdown
            monthlyLoanPayment: parseFloat(document.getElementById('monthlyLoanPayment').textContent.replace('RM ', '')),
            monthlyInsurance: parseFloat(document.getElementById('monthlyInsurance').textContent.replace('RM ', '')),
            monthlyRoadTax: parseFloat(document.getElementById('monthlyRoadTax').textContent.replace('RM ', '')),
            monthlyServicing: parseFloat(document.getElementById('monthlyServicing').textContent.replace('RM ', '')),
            monthlyFuel: parseFloat(document.getElementById('monthlyFuel').textContent.replace('RM ', '')),
            totalMonthlyCost: parseFloat(document.getElementById('totalMonthlyCost').textContent.replace('RM ', ''))
        };

        this.history.unshift(calculation);
        
        // Keep only last 20 calculations
        if (this.history.length > 20) {
            this.history = this.history.slice(0, 20);
        }
        
        localStorage.setItem('carAffordabilityHistory', JSON.stringify(this.history));
        this.displayHistory();
    }

    loadHistory() {
        const history = localStorage.getItem('carAffordabilityHistory');
        return history ? JSON.parse(history) : [];
    }

    displayHistory() {
        const historyList = document.getElementById('historyList');
        
        if (this.history.length === 0) {
            historyList.innerHTML = '<div class="no-history">No calculations yet. Click "Calculate Car Affordability" to start!</div>';
            return;
        }

        historyList.innerHTML = this.history.map((calc, index) => `
            <div class="history-item">
                <div class="history-item-header">
                    <span class="history-item-title">Calculation #${index + 1}</span>
                    <span class="history-item-date">${calc.timestamp}</span>
                </div>
                <div class="history-item-details">
                    <!-- Car Details -->
                    <div class="history-section">
                        <h6 class="history-section-title">🚗 Car Details</h6>
                        <div class="history-detail">
                            <span class="history-detail-label">Car Segment:</span>
                            <span class="history-detail-value">${this.carSegmentData[calc.carSegment].name}</span>
                        </div>
                        <div class="history-detail">
                            <span class="history-detail-label">Car Price:</span>
                            <span class="history-detail-value">RM ${calc.carPrice.toLocaleString()}</span>
                        </div>
                        <div class="history-detail">
                            <span class="history-detail-label">Down Payment:</span>
                            <span class="history-detail-value">${calc.downPaymentPercent}% (RM ${calc.downPayment.toLocaleString()})</span>
                        </div>
                        <div class="history-detail">
                            <span class="history-detail-label">Engine CC:</span>
                            <span class="history-detail-value">${calc.engineCC} cc</span>
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
                            <span class="history-detail-label">Monthly Mileage:</span>
                            <span class="history-detail-value">${calc.monthlyMileage} km</span>
                        </div>
                    </div>
                    
                    <!-- Enhanced Insurance Details -->
                    <div class="history-section">
                        <h6 class="history-section-title">🏥 Insurance Details</h6>
                        <div class="history-detail">
                            <span class="history-detail-label">Vehicle Age:</span>
                            <span class="history-detail-value">${calc.vehicleAge} years ${calc.vehicleAge > 0 ? `(Sum insured: RM ${(calc.carPrice * (1 - Math.min(calc.vehicleAge, 10) * 0.04)).toLocaleString()})` : '(New car - full value)'}</span>
                        </div>
                        <div class="history-detail">
                            <span class="history-detail-label">Driver Age:</span>
                            <span class="history-detail-value">${this.getDriverAgeDescription(calc.driverAge)}</span>
                        </div>
                        <div class="history-detail">
                            <span class="history-detail-label">NCD:</span>
                            <span class="history-detail-value">${calc.ncd}% discount</span>
                        </div>
                        <div class="history-detail">
                            <span class="history-detail-label">Coverage:</span>
                            <span class="history-detail-value">${calc.coverageType === 'comprehensive' ? 'Comprehensive' : 'Third Party (50% cheaper)'}</span>
                        </div>
                        <div class="history-detail">
                            <span class="history-detail-label">Location:</span>
                            <span class="history-detail-value">${this.getLocationName(calc.location)}</span>
                        </div>
                        <div class="history-detail">
                            <span class="history-detail-label">Body Type:</span>
                            <span class="history-detail-value">${this.getBodyTypeDescription(calc.vehicleBodyType)}</span>
                        </div>
                        <div class="history-detail">
                            <span class="history-detail-label">Ownership:</span>
                            <span class="history-detail-value">${this.getOwnershipDescription(calc.ownershipType)}</span>
                        </div>
                        <div class="history-detail">
                            <span class="history-detail-label">Add-ons:</span>
                            <span class="history-detail-value">${this.getAddonDetails(calc.includeFloodCoverage, calc.includeWindscreen)}</span>
                        </div>
                        <div class="history-detail">
                            <span class="history-detail-label">Monthly Insurance:</span>
                            <span class="history-detail-value">RM ${calc.monthlyInsurance.toFixed(2)}</span>
                        </div>
                    </div>
                    
                    <!-- Cost Breakdown -->
                    <div class="history-section">
                        <h6 class="history-section-title">💰 Cost Breakdown</h6>
                        <div class="history-detail">
                            <span class="history-detail-label">Monthly Loan:</span>
                            <span class="history-detail-value">RM ${calc.monthlyLoanPayment.toFixed(2)}</span>
                        </div>
                        <div class="history-detail">
                            <span class="history-detail-label">Monthly Insurance:</span>
                            <span class="history-detail-value">RM ${calc.monthlyInsurance.toFixed(2)}</span>
                        </div>
                        <div class="history-detail">
                            <span class="history-detail-label">Monthly Road Tax:</span>
                            <span class="history-detail-value">RM ${calc.monthlyRoadTax.toFixed(2)}</span>
                        </div>
                        <div class="history-detail">
                            <span class="history-detail-label">Monthly Servicing:</span>
                            <span class="history-detail-value">RM ${calc.monthlyServicing.toFixed(2)}</span>
                        </div>
                        <div class="history-detail">
                            <span class="history-detail-label">Monthly Fuel:</span>
                            <span class="history-detail-value">RM ${calc.monthlyFuel.toFixed(2)}</span>
                        </div>
                        <div class="history-detail total-cost">
                            <span class="history-detail-label">Total Monthly Cost:</span>
                            <span class="history-detail-value">RM ${calc.totalMonthlyCost.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    getLocationName(location) {
        switch(location) {
            case 'kl': return 'KL/Selangor (+5%)';
            case 'johor': return 'Johor (+4%)';
            case 'penang': return 'Penang (+3%)';
            case 'sabah': return 'Sabah (-5%)';
            case 'sarawak': return 'Sarawak (-5%)';
            case 'langkawi': return 'Langkawi (Standard Rate)';
            case 'standard': 
            default: return 'Standard Rate';
        }
    }

    getDriverAgeDescription(driverAge) {
        switch(driverAge) {
            case 'under25': return 'Under 25 (+20% loading)';
            case 'above60': return 'Above 60 (+10% loading)';
            case '25plus':
            default: return '25-60 years (Standard rate)';
        }
    }

    getBodyTypeDescription(bodyType) {
        switch(bodyType) {
            case 'suv': return 'SUV (+10% loading)';
            case 'mpv': return 'MPV (+10% loading)';
            case 'pickup': return 'Pickup (+5% loading)';
            case 'sedan': return 'Sedan (Standard rate)';
            case 'coupe': return 'Coupe (Standard rate)';
            default: return 'Standard rate';
        }
    }

    getOwnershipDescription(ownershipType) {
        switch(ownershipType) {
            case 'company': return 'Company/Commercial (+20% loading)';
            case 'private':
            default: return 'Private Individual (Standard rate)';
        }
    }

    getAddonDetails(flood, windscreen) {
        const addons = [];
        if (flood) addons.push('Flood Coverage');
        if (windscreen) addons.push('Windscreen Coverage');
        return addons.length > 0 ? addons.join(', ') : 'None';
    }

    clearHistory() {
        if (confirm('Are you sure you want to clear all calculation history?')) {
            this.history = [];
            localStorage.removeItem('carAffordabilityHistory');
            this.displayHistory();
        }
    }

    saveToStorage() {
        const data = {
            purchaseType: document.querySelector('input[name="purchaseType"]:checked').value,
            carSegment: document.getElementById('carSegment').value,
            carPrice: document.getElementById('carPrice').value,
            downPaymentPercent: document.getElementById('downPaymentPercent').value,
            carInterestRate: document.getElementById('carInterestRate').value,
            carLoanPeriod: document.getElementById('carLoanPeriod').value,
            engineCC: document.getElementById('engineCC').value,
            monthlyMileage: document.getElementById('monthlyMileage').value,
            vehicleAge: document.getElementById('vehicleAge').value,
            driverAge: document.getElementById('driverAge').value,
            ncd: document.getElementById('ncd').value,
            coverageType: document.getElementById('coverageType').value,
            location: document.getElementById('location').value,
            vehicleBodyType: document.getElementById('vehicleBodyType').value,
            ownershipType: document.getElementById('ownershipType').value,
            includeFloodCoverage: document.getElementById('includeFloodCoverage').checked,
            includeWindscreen: document.getElementById('includeWindscreen').checked
        };
        localStorage.setItem('carAffordabilityData', JSON.stringify(data));
    }

    loadFromStorage() {
        const data = localStorage.getItem('carAffordabilityData');
        return data ? JSON.parse(data) : null;
    }

    initializeDisplay() {
        const savedValues = this.loadFromStorage();
        if (savedValues) {
            // Set purchase type
            const purchaseType = savedValues.purchaseType || 'loan';
            document.getElementById(purchaseType + 'Purchase').checked = true;
            this.toggleLoanFields(purchaseType === 'loan');
            
            document.getElementById('carSegment').value = savedValues.carSegment || 'B';
            document.getElementById('carPrice').value = savedValues.carPrice || 100000;
            document.getElementById('downPaymentPercent').value = savedValues.downPaymentPercent || 10;
            document.getElementById('carInterestRate').value = savedValues.carInterestRate || 3.5;
            document.getElementById('carLoanPeriod').value = savedValues.carLoanPeriod || 7;
            document.getElementById('engineCC').value = savedValues.engineCC || 1600;
            document.getElementById('monthlyMileage').value = savedValues.monthlyMileage || 1000;
            document.getElementById('vehicleAge').value = savedValues.vehicleAge || 0;
            document.getElementById('driverAge').value = savedValues.driverAge || '25plus';
            document.getElementById('ncd').value = savedValues.ncd || '55';
            document.getElementById('coverageType').value = savedValues.coverageType || 'comprehensive';
            document.getElementById('location').value = savedValues.location || 'standard';
            document.getElementById('vehicleBodyType').value = savedValues.vehicleBodyType || 'sedan';
            document.getElementById('ownershipType').value = savedValues.ownershipType || 'private';
            document.getElementById('includeFloodCoverage').checked = savedValues.includeFloodCoverage || false;
            document.getElementById('includeWindscreen').checked = savedValues.includeWindscreen || false;
        }
        this.updateDownPaymentAmount(); // Calculate initial down payment amount
        this.updateDisplay(0, 0, 0, 0, 0, 0);
    }
}

// Initialize calculator when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new CarAffordabilityCalculator();
});
