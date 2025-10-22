# Database Setup Instructions for Neon

Since SQLite doesn't work with Vercel's serverless functions, we need to use a cloud database. 

## Option 1: Neon (Recommended - Free tier available)

1. Go to https://neon.tech and create a free account
2. Create a new project
3. Copy the connection string (it will look like: postgresql://username:password@host/database?sslmode=require)
4. Add this as DATABASE_URL in Vercel

## Option 2: Supabase (Also free)

1. Go to https://supabase.com and create a free account  
2. Create a new project
3. Go to Settings > Database
4. Copy the connection string
5. Add this as DATABASE_URL in Vercel

## Option 3: Use Vercel Postgres (if you have access)

Run: vercel env pull to get database credentials if already set up

Once you have the DATABASE_URL, we'll update the Prisma schema to use PostgreSQL.