let db;

// Initialize SQLite database
initSqlJs({
    locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
}).then(function (SQL) {
    db = new SQL.Database();

    // Create users table
    db.run(`
        CREATE TABLE users (
            id INTEGER PRIMARY KEY,
            email TEXT,
            pass TEXT,
            role TEXT
        )
    `);

    // Insert sample data
    db.run(`INSERT INTO users VALUES (1, 'admin', 'adminpass123', 'Administrator')`);
    db.run(`INSERT INTO users VALUES (2, 'user', 'userpass123', 'User')`);
    db.run(`INSERT INTO users VALUES (3, 'guest', 'guest123', 'Guest')`);
});

function updateCode(username, password) {
    const codeBlock = document.getElementById('codeBlock');
    const u = username || '';
    const p = password || '';

    // Helper function to highlight SQL keywords in user input
    function highlightSQL(text) {
        return text
            .replace(/\b(OR|AND|SELECT|FROM|WHERE|UNION|DROP|INSERT|DELETE|UPDATE)\b/gi, '<span class="sql-keyword">$1</span>')
            .replace(/(')/g, '<span class="sql-string">$1</span>');
    }

    codeBlock.innerHTML = `<span class="sql-keyword">SELECT</span> <span class="sql-operator">*</span>
<span class="sql-keyword">FROM</span> <span class="sql-table">users</span>
<span class="sql-keyword">WHERE</span> <span class="sql-column">email</span> <span class="sql-operator">=</span> <span class="sql-string">'${highlightSQL(u)}'</span>
  <span class="sql-keyword">AND</span> <span class="sql-column">pass</span> <span class="sql-operator">=</span> <span class="sql-string">'${highlightSQL(p)}'</span> <span class="sql-keyword">LIMIT</span> <span class="sql-operator">1</span>`;
}

document.getElementById('username').addEventListener('input', function () {
    updateCode(this.value, document.getElementById('password').value);
});

document.getElementById('password').addEventListener('input', function () {
    updateCode(document.getElementById('username').value, this.value);
});

document.getElementById('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();

    if (!db) {
        alert('Database still loading, please wait...');
        return;
    }

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const resultDiv = document.getElementById('result');
    const logsDiv = document.getElementById('logs');

    // Build the vulnerable SQL query
    const query = `SELECT * FROM users WHERE email = '${username}' AND pass = '${password}' LIMIT 1`;

    let logsHTML = `<span class="log-info">Checking supplied authentication details for ${username || '(empty)'}.</span>`;
    logsHTML += `<span class="log-info">Finding user in database.</span>`;
    logsHTML += `<span class="log-query">${query}</span>`;

    try {
        // Execute the actual SQL query
        const results = db.exec(query);

        if (results.length > 0 && results[0].values.length > 0) {
            // User found
            const user = results[0].values[0];
            const userId = user[0];
            const userEmail = user[1];
            const userRole = user[3];

            logsHTML += `<span class="log-success">Query executed successfully</span>`;
            logsHTML += `<span class="log-success">User found: ${userEmail}</span>`;
            logsHTML += `<span class="log-success">Authentication successful</span>`;

            // Check if this was an injection
            const isInjection = (password.includes("'") && password.toLowerCase().includes(" or ")) ||
                               (username.includes("'") && username.toLowerCase().includes(" or "));

            if (isInjection) {
                resultDiv.className = 'result success';
                resultDiv.innerHTML = '<strong>LOGIN SUCCESSFUL!</strong><br>SQL Injection bypassed authentication!<br>Logged in as: <strong>' + userEmail + '</strong> (' + userRole + ')<br><br>The SQL injection returned ' + results[0].values.length + ' row(s) from the database.';
            } else {
                resultDiv.className = 'result success';
                resultDiv.innerHTML = '<strong>LOGIN SUCCESSFUL!</strong><br>Welcome, <strong>' + userEmail + '</strong>! (' + userRole + ')';
            }
        } else {
            logsHTML += `<span class="log-error">Invalid credentials</span>`;
            logsHTML += `<span class="log-error">Authentication failed</span>`;

            resultDiv.className = 'result error';
            resultDiv.innerHTML = '<strong>LOGIN FAILED!</strong><br>Invalid username or password.';
        }
    } catch (error) {
        // SQL error occurred
        logsHTML += `<span class="log-error">Syntax error: ${error.message}</span>`;

        resultDiv.className = 'result error';
        resultDiv.innerHTML = '<strong>SQL ERROR!</strong><br>' + error.message;
    }

    logsDiv.innerHTML = logsHTML;
});