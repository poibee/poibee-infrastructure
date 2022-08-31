FROM nginx:1.21-alpine
RUN rm -rf /usr/share/nginx/html/*
COPY nginx.conf /etc/nginx/templates/default.conf.template
CMD ["nginx", "-g", "daemon off;"]
