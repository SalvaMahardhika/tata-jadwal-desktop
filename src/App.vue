<script setup lang="ts">
import { ref, onMounted } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { getDb } from "./services/db";

interface Teacher {
  id: number;
  nip?: string;
  name: string;
  gender: 'L' | 'P';
  status: 'active' | 'inactive';
}

const greetMsg = ref("");
const name = ref("");
const teachers = ref<Teacher[]>([]);
const dbLoading = ref(false);

async function greet() {
  // Panggilan ke Rust Tauri Command 'greet'
  try {
    greetMsg.value = await invoke("greet", { name: name.value });
  } catch (error) {
    console.error("Error invoke greet:", error);
  }
}

async function loadTeachers() {
  try {
    dbLoading.value = true;
    const db = await getDb();
    teachers.value = await db.select<Teacher[]>("SELECT * FROM teachers ORDER BY id DESC");
  } catch (error) {
    console.error("Gagal memuat data guru dari SQLite:", error);
  } finally {
    dbLoading.value = false;
  }
}

async function addDummyTeacher() {
  try {
    const db = await getDb();
    const randomNip = `1990${Math.floor(100000 + Math.random() * 900000)}`;
    await db.execute(
      "INSERT INTO teachers (nip, name, gender, status) VALUES (?, ?, ?, ?)",
      [randomNip, `Guru ${teachers.value.length + 1}`, 'L', 'active']
    );
    await loadTeachers();
  } catch (error) {
    console.error("Gagal menambah data guru dummy:", error);
  }
}

onMounted(() => {
  loadTeachers();
});
</script>

<template>
  <main class="container">
    <h1>Welcome to Tauri + Vue</h1>

    <div class="row">
      <a href="https://vite.dev" target="_blank">
        <img src="/vite.svg" class="logo vite" alt="Vite logo" />
      </a>
      <a href="https://tauri.app" target="_blank">
        <img src="/tauri.svg" class="logo tauri" alt="Tauri logo" />
      </a>
      <a href="https://vuejs.org/" target="_blank">
        <img src="./assets/vue.svg" class="logo vue" alt="Vue logo" />
      </a>
    </div>
    <p>Click on the Tauri, Vite, and Vue logos to learn more.</p>

    <!-- FITUR GREET RUST -->
    <form class="row" @submit.prevent="greet">
      <input id="greet-input" v-model="name" placeholder="Enter a name..." />
      <button type="submit">Greet</button>
    </form>
    <p>{{ greetMsg }}</p>

    <hr class="divider" />

    <!-- FITUR PENGUJIAN SQLITE LOCAL -->
    <div class="db-section">
      <h3>Pengujian Database SQLite Local</h3>
      <div class="row button-group">
        <button type="button" @click="addDummyTeacher">
          + Tambah Guru Dummy (SQLite)
        </button>
      </div>

      <div v-if="dbLoading" class="loading-text">Memuat data SQLite...</div>
      <div v-else class="teacher-list">
        <p v-if="teachers.length === 0" class="empty-text">Belum ada data guru di SQLite.</p>
        <ul v-else class="list">
          <li v-for="teacher in teachers" :key="teacher.id">
            <strong>{{ teacher.name }}</strong> (NIP: {{ teacher.nip || '-' }}) - Status: {{ teacher.status }}
          </li>
        </ul>
      </div>
    </div>
  </main>
</template>

<style scoped>
.logo.vite:hover {
  filter: drop-shadow(0 0 2em #747bff);
}

.logo.vue:hover {
  filter: drop-shadow(0 0 2em #249b73);
}

.divider {
  margin: 2rem 0;
  border: 0;
  border-top: 1px solid #ccc;
}

.db-section {
  margin-top: 1rem;
  text-align: center;
}

.button-group {
  margin-bottom: 1rem;
}

.teacher-list {
  margin-top: 1rem;
}

.list {
  list-style: none;
  padding: 0;
  margin: 0 auto;
  max-width: 400px;
  text-align: left;
}

.list li {
  padding: 0.5rem 0.8rem;
  background-color: rgba(0, 0, 0, 0.04);
  margin-bottom: 0.4rem;
  border-radius: 6px;
}

.loading-text, .empty-text {
  font-size: 0.9em;
  opacity: 0.8;
}
</style>

<style>
:root {
  font-family: Inter, Avenir, Helvetica, Arial, sans-serif;
  font-size: 16px;
  line-height: 24px;
  font-weight: 400;

  color: #0f0f0f;
  background-color: #f6f6f6;

  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-text-size-adjust: 100%;
}

.container {
  margin: 0;
  padding-top: 5vh;
  padding-bottom: 5vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  text-align: center;
}

.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: 0.75s;
}

.logo.tauri:hover {
  filter: drop-shadow(0 0 2em #24c8db);
}

.row {
  display: flex;
  justify-content: center;
}

a {
  font-weight: 500;
  color: #646cff;
  text-decoration: inherit;
}

a:hover {
  color: #535bf2;
}

h1 {
  text-align: center;
}

input,
button {
  border-radius: 8px;
  border: 1px solid transparent;
  padding: 0.6em 1.2em;
  font-size: 1em;
  font-weight: 500;
  font-family: inherit;
  color: #0f0f0f;
  background-color: #ffffff;
  transition: border-color 0.25s;
  box-shadow: 0 2px 2px rgba(0, 0, 0, 0.2);
}

button {
  cursor: pointer;
}

button:hover {
  border-color: #396cd8;
}
button:active {
  border-color: #396cd8;
  background-color: #e8e8e8;
}

input,
button {
  outline: none;
}

#greet-input {
  margin-right: 5px;
}

@media (prefers-color-scheme: dark) {
  :root {
    color: #f6f6f6;
    background-color: #2f2f2f;
  }

  a:hover {
    color: #24c8db;
  }

  input,
  button {
    color: #ffffff;
    background-color: #0f0f0f98;
  }
  button:active {
    background-color: #0f0f0f69;
  }

  .list li {
    background-color: rgba(255, 255, 255, 0.08);
  }
}
</style>