<template>
  <div class="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f8fafc] p-6">
    <div class="absolute left-[-10%] top-[-10%] h-72 w-72 rounded-full bg-[#2C7047]/5 blur-3xl"></div>
    <div class="absolute bottom-[-10%] right-[-10%] h-96 w-96 rounded-full bg-[#2C7047]/10 blur-3xl"></div>

    <div class="z-10 w-full max-w-[460px] rounded-[2rem] border border-gray-100 bg-white p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)] md:p-10">
      <div class="mb-8 flex flex-col items-center text-center">
        <div class="rounded-2xl border border-gray-50 bg-white p-3 shadow-sm">
          <img src="/proclub.png" alt="Proclub Logo" class="h-auto w-16 object-contain">
        </div>
        <h1 class="mt-5 text-2xl font-bold text-gray-900">Reset Password</h1>
        <p class="mt-2 text-sm leading-relaxed text-gray-500">
          Masukkan email akun kamu, lalu gunakan kode OTP yang dikirim untuk membuat password baru.
        </p>
      </div>

      <form class="space-y-5" @submit.prevent="step === 1 ? requestOtp() : resetPassword()">
        <div>
          <label class="mb-2 ml-1 block text-xs font-bold uppercase tracking-wider text-gray-400">Email</label>
          <input
            v-model.trim="form.email"
            type="email"
            class="block w-full rounded-2xl border p-4 text-gray-900 outline-none transition-all focus:border-[#2C7047] focus:bg-white focus:ring-2 focus:ring-[#2C7047]/20"
            :class="errors.email ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50/50'"
            placeholder="nama@student.sttcipasung.ac.id"
            :disabled="step === 2"
          >
          <p v-if="errors.email" class="mt-1.5 text-xs font-semibold text-red-500">{{ errors.email }}</p>
        </div>

        <template v-if="step === 2">
          <div>
            <label class="mb-2 ml-1 block text-xs font-bold uppercase tracking-wider text-gray-400">Kode OTP</label>
            <input
              v-model.trim="form.otp"
              inputmode="numeric"
              maxlength="6"
              class="block w-full rounded-2xl border p-4 text-center text-xl font-black tracking-[0.4em] text-gray-900 outline-none transition-all focus:border-[#2C7047] focus:bg-white focus:ring-2 focus:ring-[#2C7047]/20"
              :class="errors.otp ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50/50'"
              placeholder="000000"
            >
            <p v-if="errors.otp" class="mt-1.5 text-xs font-semibold text-red-500">{{ errors.otp }}</p>
          </div>

          <div>
            <label class="mb-2 ml-1 block text-xs font-bold uppercase tracking-wider text-gray-400">Password Baru</label>
            <input
              v-model="form.password"
              type="password"
              class="block w-full rounded-2xl border p-4 text-gray-900 outline-none transition-all focus:border-[#2C7047] focus:bg-white focus:ring-2 focus:ring-[#2C7047]/20"
              :class="errors.password ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50/50'"
              placeholder="Min. 8 karakter, ada huruf besar, kecil, angka & simbol"
            >
            <p v-if="errors.password" class="mt-1.5 text-xs font-semibold text-red-500">{{ errors.password }}</p>
          </div>

          <button
            type="button"
            class="text-xs font-bold text-[#2C7047] hover:underline"
            :disabled="isLoading"
            @click="requestOtp"
          >
            Kirim ulang kode OTP
          </button>
        </template>

        <button
          type="submit"
          :disabled="isLoading"
          class="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2C7047] p-4 font-bold tracking-wide text-white shadow-lg shadow-[#2C7047]/20 transition-all duration-300 hover:-translate-y-1 hover:bg-[#235838] hover:shadow-[#2C7047]/30 disabled:translate-y-0 disabled:bg-gray-300 disabled:shadow-none"
        >
          <Loader2 v-if="isLoading" class="h-5 w-5 animate-spin" />
          <MailCheck v-else-if="step === 1" class="h-5 w-5" />
          <KeyRound v-else class="h-5 w-5" />
          {{ isLoading ? 'Memproses...' : step === 1 ? 'Kirim Kode OTP' : 'Reset Password' }}
        </button>
      </form>

      <div class="mt-8 text-center text-sm font-medium text-gray-500">
        Ingat password?
        <router-link to="/login" class="font-bold text-[#2C7047] underline-offset-4 hover:underline">Login di sini</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { KeyRound, Loader2, MailCheck } from 'lucide-vue-next'
import api from '../api/index.js'

const router = useRouter()
const toast = useToast()
const step = ref(1)
const isLoading = ref(false)

const form = reactive({
  email: '',
  otp: '',
  password: ''
})

const errors = reactive({
  email: '',
  otp: '',
  password: ''
})

function resetErrors() {
  errors.email = ''
  errors.otp = ''
  errors.password = ''
}

function validateEmail() {
  errors.email = ''

  if (!form.email) {
    errors.email = 'Email wajib diisi.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Format email tidak valid.'
  }

  return !errors.email
}

function validateReset() {
  resetErrors()
  validateEmail()

  if (!/^[0-9]{6}$/.test(form.otp)) {
    errors.otp = 'Kode OTP harus 6 digit.'
  }

  if (
    form.password.length < 8 ||
    !/[A-Z]/.test(form.password) ||
    !/[a-z]/.test(form.password) ||
    !/[0-9]/.test(form.password) ||
    !/[^A-Za-z0-9]/.test(form.password)
  ) {
    errors.password = 'Password wajib minimal 8 karakter, huruf besar, huruf kecil, angka, dan special character.'
  }

  return !errors.email && !errors.otp && !errors.password
}

async function requestOtp() {
  resetErrors()
  if (!validateEmail()) return

  isLoading.value = true

  try {
    const response = await api.post('/auth/forgot-password', { email: form.email })
    toast.success(response.data?.message || 'Kode OTP sudah dikirim.')
    step.value = 2
  } catch (error) {
    toast.error(error.response?.data?.message || 'Gagal mengirim kode OTP.')
  } finally {
    isLoading.value = false
  }
}

async function resetPassword() {
  if (!validateReset()) return

  isLoading.value = true

  try {
    const response = await api.post('/auth/reset-password', {
      email: form.email,
      otp: form.otp,
      password: form.password
    })

    toast.success(response.data?.message || 'Password berhasil direset.')
    await router.push('/login')
  } catch (error) {
    toast.error(error.response?.data?.message || 'Gagal reset password.')
  } finally {
    isLoading.value = false
  }
}
</script>
