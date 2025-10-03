<h1 align="center">Esteban's Portfolio App</h1>
<p align="center">🔗 <a href="https://portfolioapp.org" style="text-decoration: underline;">Go to website</a></p>

***

## 1. Introduction
- **Who am I ?** My name is Esteban Tassi and I'm a self-taught junior developer. I always wanted to become a game developer, but as I grew up, my mind scattered, I wanted to be a teacher, an artist, or even a translator. I learnt and did a lot of things, traveled, studied, met people. But I always came back to my roots: coding. So after trying different things I decided on using my skills to live, I made this website in hopes of getting hired overseas, because I have no prior experience or proper education. If you're looking for a developer, please consider looking at what I made, as well as my CV <a href="/images/cv.pdf" style="text-decoration: underline;">here</a>.
- **What is this project ?** This project is, as the name implies, my portfolio: it shows a variety of skills I possess. It is still a prototype, with bugs and some ugly code. Since the start of this project, I have learnt a lot of things, making some of it obsolete. If you want to know what I'd like to change, please take a look at this <a href="#todo" style="text-decoration: underline;">todo list</a>. I made.

***

## 2. Project Overview

### Here are the tools I use to make my app a reality :

![STACK IMAGE](/images/stack.png?raw=true "Stack image")
I used Caprover on an oracle VPS to run everything but the GCS Bucket. I used Spaceship to buy the domain name portfolioapp.org, and I can access my phpMyAdmin and my Caprover panel from anywhere using pma.portfolioapp.org and captain.portfolioapp.org. Commiting to github automatically deploys the patch online, making it much easier to update the website.

***

## X. What next ?

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