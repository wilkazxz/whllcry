// Main JavaScript file for SocialHub
// Global functionality and utilities

// Notification system
class NotificationManager {
    constructor() {
        this.init();
        this.updateCount();
        this.startPolling();
    }
    
    init() {
        // Initialize notification system
        console.log('Notification system initialized');
    }
    
    updateCount() {
        // Update notification count in navbar
        if (typeof current_user !== 'undefined' && current_user.is_authenticated) {
            fetch('/notifications/count')
                .then(response => response.json())
                .then(data => {
                    const badge = document.getElementById('notification-count');
                    if (badge) {
                        badge.textContent = data.count;
                        badge.style.display = data.count > 0 ? 'inline' : 'none';
                    }
                })
                .catch(error => console.error('Error fetching notification count:', error));
        }
    }
    
    startPolling() {
        // Poll for new notifications every 30 seconds
        setInterval(() => {
            this.updateCount();
        }, 30000);
    }
}

// Theme management
class ThemeManager {
    constructor() {
        this.init();
    }
    
    init() {
        // Initialize theme from user preference or localStorage
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            this.setTheme(savedTheme);
        }
    }
    
    setTheme(theme) {
        document.documentElement.setAttribute('data-bs-theme', theme);
        localStorage.setItem('theme', theme);
        
        // Update theme toggle icon
        const themeIcon = document.querySelector('.navbar .fa-sun, .navbar .fa-moon');
        if (themeIcon) {
            themeIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }
    
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-bs-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    }
}

// Image upload preview
function setupImagePreview(inputId, previewId) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    
    if (input && preview) {
        input.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    preview.src = e.target.result;
                    preview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            } else {
                preview.style.display = 'none';
            }
        });
    }
}

// Form validation utilities
function validateForm(formId, rules) {
    const form = document.getElementById(formId);
    if (!form) return false;
    
    let isValid = true;
    
    Object.keys(rules).forEach(fieldName => {
        const field = form.querySelector(`[name="${fieldName}"]`);
        const rule = rules[fieldName];
        
        if (field) {
            // Remove existing validation classes
            field.classList.remove('is-valid', 'is-invalid');
            
            // Check required
            if (rule.required && !field.value.trim()) {
                field.classList.add('is-invalid');
                isValid = false;
                return;
            }
            
            // Check min length
            if (rule.minLength && field.value.length < rule.minLength) {
                field.classList.add('is-invalid');
                isValid = false;
                return;
            }
            
            // Check max length
            if (rule.maxLength && field.value.length > rule.maxLength) {
                field.classList.add('is-invalid');
                isValid = false;
                return;
            }
            
            // Check pattern
            if (rule.pattern && !rule.pattern.test(field.value)) {
                field.classList.add('is-invalid');
                isValid = false;
                return;
            }
            
            // Field is valid
            if (field.value.trim()) {
                field.classList.add('is-valid');
            }
        }
    });
    
    return isValid;
}

// Loading state management
function setLoadingState(buttonElement, loading = true) {
    if (loading) {
        buttonElement.disabled = true;
        buttonElement.classList.add('btn-loading');
        buttonElement.dataset.originalText = buttonElement.textContent;
        buttonElement.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Loading...';
    } else {
        buttonElement.disabled = false;
        buttonElement.classList.remove('btn-loading');
        buttonElement.textContent = buttonElement.dataset.originalText || 'Submit';
    }
}

// Utility functions
const Utils = {
    // Format time ago
    timeAgo(date) {
        const now = new Date();
        const diff = now - new Date(date);
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        return 'Just now';
    },
    
    // Debounce function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // Copy to clipboard
    copyToClipboard(text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                this.showToast('Copied to clipboard!', 'success');
            });
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showToast('Copied to clipboard!', 'success');
        }
    },
    
    // Show toast notification
    showToast(message, type = 'info') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${type} border-0`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;
        
        // Add to toast container or create one
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
            document.body.appendChild(container);
        }
        
        container.appendChild(toast);
        
        // Initialize and show toast
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
        
        // Remove toast element after it's hidden
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    },
    
    // Format file size
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },
    
    // Validate email
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },
    
    // Sanitize HTML
    sanitizeHTML(str) {
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    }
};

// Auto-save functionality for forms
class AutoSave {
    constructor(formId, saveInterval = 30000) {
        this.form = document.getElementById(formId);
        this.saveInterval = saveInterval;
        this.storageKey = `autosave_${formId}`;
        
        if (this.form) {
            this.init();
        }
    }
    
    init() {
        // Load saved data
        this.loadSavedData();
        
        // Setup auto-save
        this.form.addEventListener('input', Utils.debounce(() => {
            this.saveData();
        }, 1000));
        
        // Save on form submit and clear storage
        this.form.addEventListener('submit', () => {
            this.clearSavedData();
        });
        
        // Periodic save
        setInterval(() => {
            this.saveData();
        }, this.saveInterval);
    }
    
    saveData() {
        const formData = new FormData(this.form);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        localStorage.setItem(this.storageKey, JSON.stringify(data));
        Utils.showToast('Draft saved', 'info');
    }
    
    loadSavedData() {
        const savedData = localStorage.getItem(this.storageKey);
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                Object.keys(data).forEach(key => {
                    const field = this.form.querySelector(`[name="${key}"]`);
                    if (field && field.type !== 'file') {
                        field.value = data[key];
                    }
                });
                Utils.showToast('Draft restored', 'success');
            } catch (e) {
                console.error('Error loading saved data:', e);
            }
        }
    }
    
    clearSavedData() {
        localStorage.removeItem(this.storageKey);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize core components
    window.notificationManager = new NotificationManager();
    window.themeManager = new ThemeManager();
    
    // Setup common functionality
    setupGlobalEventListeners();
    setupFormValidation();
    setupImagePreviews();
    
    // Initialize auto-save for post creation form
    if (document.getElementById('post-form')) {
        new AutoSave('post-form');
    }
    
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Initialize popovers
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });
});

function setupGlobalEventListeners() {
    // Theme toggle
    document.addEventListener('click', function(e) {
        if (e.target.closest('.theme-toggle')) {
            e.preventDefault();
            window.themeManager.toggleTheme();
        }
    });
    
    // Confirmation dialogs
    document.addEventListener('click', function(e) {
        if (e.target.hasAttribute('data-confirm')) {
            if (!confirm(e.target.getAttribute('data-confirm'))) {
                e.preventDefault();
            }
        }
    });
    
    // Auto-hide alerts
    const alerts = document.querySelectorAll('.alert:not(.alert-permanent)');
    alerts.forEach(alert => {
        setTimeout(() => {
            if (alert.parentNode) {
                const bsAlert = new bootstrap.Alert(alert);
                bsAlert.close();
            }
        }, 5000);
    });
}

function setupFormValidation() {
    // Real-time form validation
    const forms = document.querySelectorAll('form[data-validate]');
    forms.forEach(form => {
        const inputs = form.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.addEventListener('blur', function() {
                validateField(this);
            });
            
            input.addEventListener('input', Utils.debounce(function() {
                validateField(this);
            }, 500));
        });
    });
}

function validateField(field) {
    // Remove existing validation classes
    field.classList.remove('is-valid', 'is-invalid');
    
    // Get validation rules from data attributes
    const required = field.hasAttribute('required');
    const minLength = field.getAttribute('minlength');
    const maxLength = field.getAttribute('maxlength');
    const pattern = field.getAttribute('pattern');
    const type = field.getAttribute('type');
    
    let isValid = true;
    
    // Required validation
    if (required && !field.value.trim()) {
        isValid = false;
    }
    
    // Length validation
    if (minLength && field.value.length < parseInt(minLength)) {
        isValid = false;
    }
    
    if (maxLength && field.value.length > parseInt(maxLength)) {
        isValid = false;
    }
    
    // Pattern validation
    if (pattern && field.value && !new RegExp(pattern).test(field.value)) {
        isValid = false;
    }
    
    // Email validation
    if (type === 'email' && field.value && !Utils.isValidEmail(field.value)) {
        isValid = false;
    }
    
    // Apply validation classes
    if (field.value.trim()) {
        field.classList.add(isValid ? 'is-valid' : 'is-invalid');
    }
}

function setupImagePreviews() {
    // Setup image preview for file inputs
    const fileInputs = document.querySelectorAll('input[type="file"][accept*="image"]');
    fileInputs.forEach(input => {
        input.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                // Create preview if it doesn't exist
                let preview = document.getElementById(input.id + '-preview');
                if (!preview) {
                    preview = document.createElement('img');
                    preview.id = input.id + '-preview';
                    preview.className = 'img-preview mt-2 img-thumbnail';
                    preview.style.maxWidth = '200px';
                    preview.style.maxHeight = '200px';
                    input.parentNode.appendChild(preview);
                }
                
                const reader = new FileReader();
                reader.onload = function(e) {
                    preview.src = e.target.result;
                    preview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
    });
}

// Export utilities for use in other scripts
window.SocialHub = {
    Utils,
    NotificationManager,
    ThemeManager,
    AutoSave,
    setLoadingState,
    validateForm,
    setupImagePreview
};
