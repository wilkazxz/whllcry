from flask_wtf import FlaskForm
from flask_wtf.file import FileField, FileAllowed, FileRequired
from wtforms import StringField, TextAreaField, PasswordField, BooleanField, SelectField, IntegerField, DateTimeField
from wtforms.validators import DataRequired, Length, Email, EqualTo, Optional, NumberRange, ValidationError
from models import User

class RegistrationForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired(), Length(min=4, max=20)])
    email = StringField('Email', validators=[DataRequired(), Email()])
    password = PasswordField('Password', validators=[DataRequired(), Length(min=6)])
    password2 = PasswordField('Repeat Password', validators=[DataRequired(), EqualTo('password')])
    
    def validate_username(self, username):
        user = User.query.filter_by(username=username.data).first()
        if user:
            raise ValidationError('Username already taken. Please choose a different one.')
    
    def validate_email(self, email):
        user = User.query.filter_by(email=email.data).first()
        if user:
            raise ValidationError('Email already registered. Please choose a different one.')

class LoginForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired()])
    password = PasswordField('Password', validators=[DataRequired()])
    remember_me = BooleanField('Remember Me')

class PostForm(FlaskForm):
    title = StringField('Title', validators=[DataRequired(), Length(max=200)])
    content = TextAreaField('Content', validators=[DataRequired()])
    image = FileField('Image', validators=[FileAllowed(['jpg', 'png', 'jpeg', 'gif'], 'Images only!')])

class CommentForm(FlaskForm):
    content = TextAreaField('Comment', validators=[DataRequired(), Length(max=500)])

class ProfileForm(FlaskForm):
    bio = TextAreaField('Bio', validators=[Length(max=500)])
    profile_image = FileField('Profile Image', validators=[FileAllowed(['jpg', 'png', 'jpeg'], 'Images only!')])

class MessageForm(FlaskForm):
    content = TextAreaField('Message', validators=[DataRequired(), Length(max=500)])

class VideoUploadForm(FlaskForm):
    title = StringField('Title', validators=[DataRequired(), Length(max=200)])
    description = TextAreaField('Description', validators=[Length(max=500)])
    video = FileField('Video', validators=[
        FileRequired(),
        FileAllowed(['mp4', 'webm', 'avi'], 'Video files only!')
    ])

class ReportForm(FlaskForm):
    reason = SelectField('Reason', choices=[
        ('spam', 'Spam'),
        ('harassment', 'Harassment'),
        ('inappropriate', 'Inappropriate Content'),
        ('fake', 'Fake Information'),
        ('other', 'Other')
    ], validators=[DataRequired()])
    description = TextAreaField('Description', validators=[Length(max=500)])

class PollForm(FlaskForm):
    question = StringField('Question', validators=[DataRequired(), Length(max=500)])
    option1 = StringField('Option 1', validators=[DataRequired(), Length(max=200)])
    option2 = StringField('Option 2', validators=[DataRequired(), Length(max=200)])
    option3 = StringField('Option 3', validators=[Optional(), Length(max=200)])
    option4 = StringField('Option 4', validators=[Optional(), Length(max=200)])
    duration_hours = IntegerField('Duration (hours)', validators=[Optional(), NumberRange(min=1, max=168)])

class QuizForm(FlaskForm):
    answer = StringField('Answer', validators=[DataRequired()])

class GuessNumberForm(FlaskForm):
    guess = IntegerField('Your Guess', validators=[DataRequired(), NumberRange(min=1, max=100)])
