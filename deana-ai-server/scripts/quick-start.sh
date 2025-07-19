#!/bin/bash

echo "🚀 Deana.AI Express Server Quick Start"
echo "======================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Check if PostgreSQL is running
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL client not found. Please install PostgreSQL."
    echo "   You can still proceed, but you'll need to set up the database manually."
else
    echo "✅ PostgreSQL client found"
fi

# Check if oauth.env exists
if [ ! -f "oauth.env" ]; then
    echo ""
    echo "📝 Creating oauth.env from template..."
    cp oauth.env.example oauth.env
    echo "✅ Created oauth.env"
    echo "⚠️  Please edit oauth.env with your actual configuration values"
else
    echo "✅ oauth.env already exists"
fi

# Install dependencies if needed
echo ""
echo "📦 Installing dependencies..."
npm install

# Check if database is accessible
if command -v psql &> /dev/null; then
    echo ""
    echo "🔍 Testing database connection..."
    if psql -h localhost -U postgres -d deana_ai -c "SELECT 1;" &> /dev/null; then
        echo "✅ Database connection successful"
    else
        echo "⚠️  Database connection failed. Please ensure PostgreSQL is running and configured."
        echo "   You can create the database with: createdb deana_ai"
    fi
fi

echo ""
echo "🎯 Next Steps:"
echo "1. Edit oauth.env with your configuration"
echo "2. Set up PostgreSQL database (if not done)"
echo "3. Run: npm run server:dev (to start Express server)"
echo "4. Run: npm run dev (to start React app)"
echo "5. Run: npm run migrate (to migrate data from Supabase)"
echo ""
echo "📚 For detailed instructions, see MIGRATION_GUIDE.md"
echo ""
echo "🎉 Setup complete! Happy coding!"
