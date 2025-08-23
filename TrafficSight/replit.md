# SocialHub - Social Media Platform

## Overview

SocialHub is a comprehensive social media platform built with Flask, featuring user authentication, content sharing, real-time interactions, and gamification elements. The platform supports posts with images, video uploads, live chat functionality, polls, mini-games, and a complete user management system with admin capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Backend Framework
- **Flask**: Web framework with modular blueprint structure
- **SQLAlchemy**: ORM for database operations using DeclarativeBase pattern
- **Flask-Login**: User session management and authentication
- **Flask-WTF**: Form handling and CSRF protection
- **Werkzeug**: File upload handling and security utilities

### Database Design
- **User-centric model** with comprehensive profile management
- **Content models** for posts, videos, comments, and media
- **Social features** including likes, follows, and messaging
- **Gamification** with points, levels, badges, and game scores
- **Administrative** reporting and moderation systems
- **Real-time features** with visitor tracking and online status

### Authentication & Authorization
- **Role-based access control** with admin and regular user roles
- **Session-based authentication** with remember-me functionality
- **Profile verification system** with verified badges
- **Password hashing** using Werkzeug security functions

### File Management
- **Secure file uploads** with UUID-based naming
- **Image processing** with PIL for resizing and optimization
- **Multiple upload types** supporting images and videos
- **Static file serving** through Flask's static folder structure

### Frontend Architecture
- **Bootstrap-based UI** with responsive design
- **Template inheritance** using Jinja2 base templates
- **Progressive enhancement** with vanilla JavaScript
- **Real-time updates** through polling mechanisms
- **Game implementations** using HTML5 Canvas

### Core Features
- **Content Management**: Posts with text and images, video uploads
- **Social Interactions**: Comments, likes/dislikes, messaging systems
- **Real-time Chat**: Global chat and private messaging
- **Gamification**: Mini-games (Snake, Quiz, Number Guessing) with leaderboards
- **Community Features**: Polls with voting, user profiles, status tracking
- **Administrative Tools**: User management, content moderation, reporting system

### Security Measures
- **CSRF protection** on all forms
- **File type validation** for uploads
- **Secure filename handling** to prevent directory traversal
- **Input sanitization** and validation
- **Admin-only route protection**

## External Dependencies

### Core Libraries
- **Flask**: Web framework and routing
- **SQLAlchemy**: Database ORM and connection management
- **Flask-Login**: User authentication and session management
- **Flask-WTF**: Form handling and validation
- **WTForms**: Form field definitions and validators
- **Werkzeug**: WSGI utilities and security functions
- **Pillow (PIL)**: Image processing and manipulation

### Frontend Resources
- **Bootstrap CSS/JS**: UI framework and components
- **Font Awesome**: Icon library for user interface elements
- **Chart.js**: Data visualization for admin statistics

### Python Standard Library
- **datetime/pytz**: Timezone handling (Asia/Jakarta)
- **os**: File system operations
- **uuid**: Unique identifier generation
- **logging**: Application logging and debugging

### Database
- **Database agnostic design** supporting SQLAlchemy-compatible databases
- **Connection pooling** with automatic reconnection
- **Environment-based configuration** for database URLs

### Development Tools
- **ProxyFix**: WSGI middleware for reverse proxy deployments
- **Environment variables**: Configuration management for secrets and URLs