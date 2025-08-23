// Chat functionality for SocialHub
// Handles global chat and private messaging

class ChatManager {
    constructor(chatType = 'global') {
        this.chatType = chatType;
        this.messageContainer = document.getElementById('chat-messages');
        this.messageForm = document.getElementById('message-form');
        this.messageInput = document.getElementById('message-input');
        this.isScrolledToBottom = true;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.setupAutoScroll();
        this.startAutoRefresh();
        
        // Initial scroll to bottom
        setTimeout(() => {
            this.scrollToBottom();
        }, 100);
    }
    
    setupEventListeners() {
        // Form submission
        if (this.messageForm) {
            this.messageForm.addEventListener('submit', (e) => {
                this.handleSubmit(e);
            });
        }
        
        // Enter key to send (Shift+Enter for new line)
        if (this.messageInput) {
            this.messageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.messageForm.dispatchEvent(new Event('submit', { cancelable: true }));
                }
            });
            
            // Auto-resize textarea
            this.messageInput.addEventListener('input', () => {
                this.autoResizeTextarea();
            });
        }
        
        // Scroll detection
        if (this.messageContainer) {
            this.messageContainer.addEventListener('scroll', () => {
                this.checkScrollPosition();
            });
        }
    }
    
    setupAutoScroll() {
        // Observe new messages being added
        if (this.messageContainer) {
            const observer = new MutationObserver(() => {
                if (this.isScrolledToBottom) {
                    this.scrollToBottom();
                }
            });
            
            observer.observe(this.messageContainer, {
                childList: true,
                subtree: true
            });
        }
    }
    
    startAutoRefresh() {
        // Refresh messages every 3 seconds for global chat
        if (this.chatType === 'global') {
            this.refreshInterval = setInterval(() => {
                this.refreshMessages();
            }, 3000);
        }
    }
    
    handleSubmit(e) {
        if (!this.messageInput.value.trim()) {
            e.preventDefault();
            return false;
        }
        
        // Show sending indicator
        this.showSendingIndicator();
        
        // The form will submit normally, but we show feedback
        setTimeout(() => {
            this.messageInput.value = '';
            this.autoResizeTextarea();
        }, 100);
    }
    
    refreshMessages() {
        // Only refresh if user hasn't scrolled up significantly
        if (this.isScrolledToBottom || this.isNearBottom()) {
            // Use a subtle method to check for new messages
            this.checkForNewMessages();
        }
    }
    
    checkForNewMessages() {
        // This would typically make an AJAX request to check for new messages
        // For now, we'll just reload if we're on the global chat
        if (this.chatType === 'global' && this.isScrolledToBottom) {
            // Gentle reload - only if user is actively viewing
            if (document.visibilityState === 'visible') {
                location.reload();
            }
        }
    }
    
    scrollToBottom() {
        if (this.messageContainer) {
            this.messageContainer.scrollTop = this.messageContainer.scrollHeight;
        }
    }
    
    checkScrollPosition() {
        if (this.messageContainer) {
            const { scrollTop, scrollHeight, clientHeight } = this.messageContainer;
            this.isScrolledToBottom = (scrollTop + clientHeight >= scrollHeight - 10);
        }
    }
    
    isNearBottom() {
        if (this.messageContainer) {
            const { scrollTop, scrollHeight, clientHeight } = this.messageContainer;
            return (scrollTop + clientHeight >= scrollHeight - 100);
        }
        return true;
    }
    
    autoResizeTextarea() {
        if (this.messageInput) {
            this.messageInput.style.height = 'auto';
            this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px';
        }
    }
    
    showSendingIndicator() {
        if (this.messageInput) {
            this.messageInput.placeholder = 'Sending...';
            this.messageInput.disabled = true;
            
            setTimeout(() => {
                this.messageInput.placeholder = 'Type your message...';
                this.messageInput.disabled = false;
                this.messageInput.focus();
            }, 1000);
        }
    }
    
    destroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }
}

// Emoji picker functionality
class EmojiPicker {
    constructor(inputElement) {
        this.input = inputElement;
        this.emojis = [
            '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣',
            '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰',
            '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜',
            '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏',
            '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
            '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠',
            '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨',
            '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤐',
            '😐', '😑', '😶', '😴', '😪', '🤤', '😋', '🤮',
            '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿',
            '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽',
            '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼',
            '😽', '🙀', '😿', '😾', '❤️', '🧡', '💛', '💚',
            '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕',
            '💖', '💗', '💘', '💝', '💟', '☮️', '✝️', '☪️',
            '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐',
            '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎',
            '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑'
        ];
        
        this.createPicker();
    }
    
    createPicker() {
        // Create emoji button
        this.button = document.createElement('button');
        this.button.type = 'button';
        this.button.className = 'btn btn-outline-secondary';
        this.button.innerHTML = '😀';
        this.button.title = 'Add emoji';
        
        // Create picker dropdown
        this.picker = document.createElement('div');
        this.picker.className = 'emoji-picker dropdown-menu';
        this.picker.style.display = 'none';
        this.picker.style.maxHeight = '200px';
        this.picker.style.overflowY = 'auto';
        this.picker.style.width = '280px';
        this.picker.style.padding = '10px';
        
        // Add emojis to picker
        this.emojis.forEach(emoji => {
            const emojiBtn = document.createElement('button');
            emojiBtn.type = 'button';
            emojiBtn.className = 'btn btn-sm';
            emojiBtn.style.width = '30px';
            emojiBtn.style.height = '30px';
            emojiBtn.style.padding = '2px';
            emojiBtn.style.margin = '2px';
            emojiBtn.textContent = emoji;
            
            emojiBtn.addEventListener('click', () => {
                this.insertEmoji(emoji);
            });
            
            this.picker.appendChild(emojiBtn);
        });
        
        // Setup events
        this.button.addEventListener('click', (e) => {
            e.preventDefault();
            this.togglePicker();
        });
        
        // Close picker when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.button.contains(e.target) && !this.picker.contains(e.target)) {
                this.hidePicker();
            }
        });
        
        // Insert button and picker into DOM
        if (this.input.parentNode) {
            this.input.parentNode.style.position = 'relative';
            this.input.parentNode.appendChild(this.button);
            this.input.parentNode.appendChild(this.picker);
        }
    }
    
    togglePicker() {
        if (this.picker.style.display === 'none') {
            this.showPicker();
        } else {
            this.hidePicker();
        }
    }
    
    showPicker() {
        this.picker.style.display = 'block';
        this.picker.style.position = 'absolute';
        this.picker.style.bottom = '100%';
        this.picker.style.right = '0';
        this.picker.style.zIndex = '1050';
    }
    
    hidePicker() {
        this.picker.style.display = 'none';
    }
    
    insertEmoji(emoji) {
        const cursorPos = this.input.selectionStart;
        const textBefore = this.input.value.substring(0, cursorPos);
        const textAfter = this.input.value.substring(this.input.selectionEnd);
        
        this.input.value = textBefore + emoji + textAfter;
        this.input.selectionStart = this.input.selectionEnd = cursorPos + emoji.length;
        this.input.focus();
        
        this.hidePicker();
        
        // Trigger input event for auto-resize
        this.input.dispatchEvent(new Event('input'));
    }
}

// Message formatting utilities
const MessageFormatter = {
    // Format URLs as links
    linkify(text) {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
    },
    
    // Format mentions
    formatMentions(text) {
        const mentionRegex = /@(\w+)/g;
        return text.replace(mentionRegex, '<span class="mention">@$1</span>');
    },
    
    // Escape HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    // Format message with all formatters
    formatMessage(text) {
        let formatted = this.escapeHtml(text);
        formatted = this.linkify(formatted);
        formatted = this.formatMentions(formatted);
        return formatted;
    }
};

// Typing indicator
class TypingIndicator {
    constructor(chatType = 'global') {
        this.chatType = chatType;
        this.typingUsers = new Set();
        this.typingTimeout = null;
        this.isTyping = false;
    }
    
    startTyping(username) {
        this.typingUsers.add(username);
        this.updateIndicator();
        
        // Clear existing timeout
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
        }
        
        // Remove user after 3 seconds of inactivity
        this.typingTimeout = setTimeout(() => {
            this.stopTyping(username);
        }, 3000);
    }
    
    stopTyping(username) {
        this.typingUsers.delete(username);
        this.updateIndicator();
    }
    
    updateIndicator() {
        let indicator = document.getElementById('typing-indicator');
        
        if (this.typingUsers.size === 0) {
            if (indicator) {
                indicator.remove();
            }
            return;
        }
        
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'typing-indicator';
            indicator.className = 'typing-indicator text-muted small p-2';
            
            const messageContainer = document.getElementById('chat-messages');
            if (messageContainer) {
                messageContainer.appendChild(indicator);
            }
        }
        
        const users = Array.from(this.typingUsers);
        let text = '';
        
        if (users.length === 1) {
            text = `${users[0]} is typing...`;
        } else if (users.length === 2) {
            text = `${users[0]} and ${users[1]} are typing...`;
        } else {
            text = `${users.length} people are typing...`;
        }
        
        indicator.innerHTML = `
            <i class="fas fa-ellipsis-h typing-dots"></i>
            ${text}
        `;
    }
}

// Chat utilities
const ChatUtils = {
    // Get timestamp for message
    getTimestamp() {
        return new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
    },
    
    // Get relative time
    getRelativeTime(date) {
        const now = new Date();
        const messageTime = new Date(date);
        const diff = now - messageTime;
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes}m ago`;
        return 'Just now';
    },
    
    // Play notification sound
    playNotificationSound() {
        if ('Notification' in window && Notification.permission === 'granted') {
            // Create a subtle notification sound
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjeIz/LNeSsFJILL8d+ROw');
            audio.volume = 0.1;
            audio.play().catch(() => {
                // Ignore errors (user might not have interacted with page yet)
            });
        }
    },
    
    // Request notification permission
    requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    },
    
    // Show desktop notification for new message
    showNotification(title, message, username) {
        if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification(title, {
                body: `${username}: ${message}`,
                icon: '/static/favicon.ico',
                tag: 'chat-message'
            });
            
            // Auto-close after 4 seconds
            setTimeout(() => {
                notification.close();
            }, 4000);
        }
    }
};

// Initialize chat when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Determine chat type based on URL
    const isGlobalChat = window.location.pathname.includes('/chat/global');
    const isPrivateChat = window.location.pathname.includes('/chat/private');
    
    if (isGlobalChat || isPrivateChat) {
        const chatType = isGlobalChat ? 'global' : 'private';
        
        // Initialize chat manager
        window.chatManager = new ChatManager(chatType);
        
        // Initialize emoji picker if message input exists
        const messageInput = document.getElementById('message-input');
        if (messageInput) {
            window.emojiPicker = new EmojiPicker(messageInput);
        }
        
        // Initialize typing indicator
        window.typingIndicator = new TypingIndicator(chatType);
        
        // Request notification permission
        ChatUtils.requestNotificationPermission();
    }
});

// Clean up when leaving page
window.addEventListener('beforeunload', function() {
    if (window.chatManager) {
        window.chatManager.destroy();
    }
});

// Export for global use
window.ChatManager = ChatManager;
window.EmojiPicker = EmojiPicker;
window.MessageFormatter = MessageFormatter;
window.TypingIndicator = TypingIndicator;
window.ChatUtils = ChatUtils;
