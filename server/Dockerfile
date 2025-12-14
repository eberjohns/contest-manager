# /server/Dockerfile

# Use a lightweight Node.js image
FROM node:18-alpine

# Create the working directory inside the container
WORKDIR /app

# Copy package files first (for better caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the code
COPY . .

# Expose the port
EXPOSE 3000

# Start the server
CMD ["node", "server.js"]