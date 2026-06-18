// =======================================
// TypeScript-like Interface (for understanding)
// interface User {
//    id: number;
//    name: string;
//    email: string;
// }
// =======================================
// API Layer (Async Programming)
const UserAPI = {
    fetchUsers: async function () {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const success = true;
                if (success) {
                    resolve([
                        { id: 1, name: "Keerthana", email: "keerthana@gmail.com" },
                        { id: 2, name: "greeshma", email: "greeshma@gmail.com" },
                        { id: 3, name: "keerthi", email: "keerthi@gmail.com" },
                        { id: 4, name: "poojitha", email: "poojitha@gmail.com"},
                        { id: 5, name: "jahnavi", email: "jahnavi@gmail.com"},
                        { id: 6, name: "bhargavi", email: "bhargavi@gmail.com"},
                        { id: 7, name: "manasa", email: "manasa@gmail.com"}
                     ]);
                } else {
                    reject("Failed to fetch users");
                }
            }, 2000);
        });
    }
};
// UI Layer
const UI = {
    displayUsers(users) {
        const userList = document.getElementById("userList");
        userList.innerHTML = "";
        users.forEach(user => {
            const li = document.createElement("li");
            li.textContent = `${user.name} - ${user.email}`;
            userList.appendChild(li);
        });
    }
};
// Controller Layer
async function loadUsers() {
    try {
        console.log("Loading users...");
        const users = await UserAPI.fetchUsers();
        UI.displayUsers(users);
        console.log("Users loaded successfully");
    } catch (error) {
        console.error("Error:", error);
        alert("Something went wrong!");
    }
}
