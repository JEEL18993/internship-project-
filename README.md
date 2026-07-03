# ShopEase E-commerce Project

This project was created for the Acmegrade full stack web development internship submission. It includes all requested admin and client modules and uses MongoDB for database storage.

## Modules Included

### Admin

- Login
- Add products
- View products
- Delete products
- View orders

### Client

- Register
- Login
- View products
- Add to cart
- View cart
- Delete cart item
- Place order

## Admin Login

- Email: `admin@shop.com`
- Password: `admin123`

Admin does not need to register. The admin account is already available by default.

Admin login procedure:

1. Run the project.
2. Open `http://localhost:3000`.
3. Click `Admin`.
4. Enter the admin email and password above.
5. After login, admin can add products, view products, delete products, and view orders.

## How to Run

1. Install Node.js if it is not installed.
2. Install MongoDB Community Server, or create a MongoDB Atlas database.
3. Open this project folder in terminal.
4. Install project dependencies:

```bash
npm install
```

5. Run:

```bash
npm start
```

On Windows PowerShell, if `npm` is blocked by execution policy, use either:

```bash
npm.cmd start
```

or:

```bash
node server.js
```

6. Open:

```text
http://localhost:3000
```

You can also double-click `run-project.bat`.

## MongoDB Setup

The project reads MongoDB settings from `.env`.

Current database:

```text
MongoDB Atlas
```

Database name:

```text
shopease
```

Local MongoDB fallback:

```text
mongodb://127.0.0.1:27017
```

If you want to change the database connection, edit:

```text
.env
```

The password in the Atlas link must be URL encoded when it has special characters. For example, `@` becomes `%40`.

You can also set a connection URL manually before running:

```bash
set MONGODB_URI=your_mongodb_atlas_connection_string
node server.js
```

Optional database name:

```bash
set DB_NAME=shopease
```

## Project Structure

```text
server.js          Backend server, routing, authentication, product, cart, and order logic
public/styles.css  Frontend styling
package.json       Project metadata and start script
```

## Product Categories

Products are separated category-wise:

- Grocery
- Clothes
- Electronic Gadgets
- Footwear
- Home Appliances
- Beauty
- Books
- Sports

## Submission

Upload the complete project folder to Google Drive and share the drive link with:

```text
kalidas@acmegrade.in
```
