<h1 align="center">Esteban's Portfolio App</h1>
<p align="center">🔗 <a href="https://portfolioapp.org" style="text-decoration: underline;">Go to website</a></p>

***

## 1. Introduction
- **Who am I ?** My name is Esteban Tassi and I'm a self-taught junior developer. I always wanted to become a game developer, but as I grew up, my mind scattered, I wanted to be a teacher, an artist, or even a translator. I learnt and did a lot of things, traveled, studied, met people. But I always came back to my roots: coding. So after trying different things I decided on using my skills to live, I made this website in hopes of getting hired overseas, because I have no prior experience or proper education. If you're looking for a developer, please consider looking at what I made, as well as my Resume <a href="/images/resume.pdf" style="text-decoration: underline;">here</a>.
- **What is this project ?** This project is, as the name implies, my portfolio: it shows a variety of skills I possess. It is still a prototype, with bugs and some ugly code. Since the start of this project, I have learnt a lot of things, making some of it obsolete. If you want to know what I'd like to change, please take a look at this <a href="#todo" style="text-decoration: underline;">todo list</a>. I made.

***

## 2. Project Overview

### Here are the tools I use to make my app a reality :

![STACK IMAGE](/images/stack.png?raw=true "Stack image")
I used Caprover on an oracle VPS to run everything but the GCS Bucket. I used Spaceship to buy the domain name <a href="https://portfolioapp.org" style="text-decoration: underline;">portfolioapp.org</a>, and I can access my phpMyAdmin and my Caprover panel from anywhere using <a href="https://pma.portfolioapp.org" style="text-decoration: underline;">pma.portfolioapp.org</a> and <a href="https://captain.portfolioapp.org" style="text-decoration: underline;">captain.portfolioapp.org</a>. Commiting to github automatically deploys the patch online, making it much easier to update the website.

### Here are all the features the website contains :

- #### Client Security
- Messages are encrypted using asymmetric keys. The private key is stored encrypted on the server and can only be decrypted by the user's password, email and 2FA secret on login. Messages support text and/or an image, the code allows for multiple images but I need to set it up on the frontend. Both images and text are stored fully encrypted and can't be read by users or the server (E2EE). The private key is stored inside localStorage (bad idea and I will fix it).
- The login system uses SRP (Secure Remote Password), meaning the server never ever sees your password, and it's never sent to the network.
- 2FA using email by default or authenticator app if enabled in settings.
- Images have their metadata stripped and get stored on a private GCS (Google Cloud Storage) Bucket. Only the server can request an image by creating a signed URL or fetching it from the Redis Cache.
- No sensitive data is stored inside the database, everything is either hashed or encrypted.
- Settings page only accessible using 2FA (when enabled) and password.
- Blocking someone instantly kicks them out of messages, restricts them from accessing your messages and unfollows each other.
- Ability to log out everyone from the account in settings.
##
- #### Server Security
- Requests are limited by IP.
- Every single input sent to the server is checked before any action is taken to prevent abuse.
- Checks are done often to delete expired values from the database such as tokens.
- On signup, account must be verified, otherwise the account will be deleted in the next ~24 hours.
- Account deletion will delete everything: posts, images, messages, etc... It will also delete messages that other users sent to that user. I use a SQL job to create a table when images get deleted to clear them from the GCS Bucket.
##
- #### Website features
- The website is responsive, although the mobile version isn't perfect.
- The profile page and messages page use the user ID as a parameter because it can never be changed.
- Websockets are used for real-time information such as messages, notifications and follow status.
- You can change your email and password in your settings.
- You can edit your profile (banner, avatar, biography, tag and username). Your tag can't be a number except your account ID (for authenticity).
- You can block, follow and message other users.
- You can receive notifications from other users in real time.
- You can post text and/or images on the main page.
- You can like and/or reply to someone else's post or reply.
- You can call people using WEBRTCs if you follow each other. This feature broke after I published the website.
##
- #### Server Optimizations
- Caching system with Redis AND localStorage (so both local to the server and local to the user).
- Refresh/Access tokens system with path, httpOnly & more (Access tokens inside Redis for very fast auth checks).
- Most image formats are supported (gifs included), everything is converted to webp for better performance and support.

## 3. How it works

### Login system explained :

![STACK IMAGE](/images/srp.png?raw=true "SRP image")
- SRP (Secure Remote Password) is an advanced password system that prevents the user from sending their password to the server. The password is used alongside other variables to create a session on the client, the server then securely verifies the session. The example above is heavily simplified, but explains roughly how it works.

![STACK IMAGE](/images/tokens.png?raw=true "Tokens image")
- The token system uses Refresh and Access tokens. The Access token is sent over the network for each request requiring authentication, so it's short lived to shorten the attack window of hackers. The Refresh token is sent only once - when the Access token is expired - after this a new one is created and sent to the client. The current system contains IP-based tokens (the tokens store the IP of the session), but it's disabled until I add agent-based tokens (agent = browser) and allow the user to toggle those settings.

***

## 4. What next ?

**<p id="todo">There are a few things I'd like to do in the future :</p>**
- Use websockets for most of the requests to get faster responses
- Switch to SPA method (prevent refreshing components the user already opened)
- Rework the UI/UX
- Request limits per accounts instead of only IP
- Privacy policy (legal stuff)
- Toggle IP-based checks in settings + add agent-based checks (IP-based checks disabled until setting is added)
- Account deletion
- Remake the settings page (use state instead of ugly if statements)
- SEO