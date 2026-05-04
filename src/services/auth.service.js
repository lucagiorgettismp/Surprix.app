import {
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signOut,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  deleteUser,
  updatePassword,
  EmailAuthProvider,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { auth } from './firebase'

const googleProvider = new GoogleAuthProvider()
const facebookProvider = new FacebookAuthProvider()

const withPopupOrRedirect = async (provider) => {
  try {
    return await signInWithPopup(auth, provider)
  } catch (e) {
    if (e.code === 'auth/popup-blocked') {
      await signInWithRedirect(auth, provider)
      return null
    }
    throw e
  }
}

export const loginWithEmail = (email, password) =>
  signInWithEmailAndPassword(auth, email, password)

export const loginWithGoogle = () => withPopupOrRedirect(googleProvider)

export const loginWithFacebook = () => withPopupOrRedirect(facebookProvider)

export const handleRedirectResult = () => getRedirectResult(auth)

export const registerWithEmail = (email, password) =>
  createUserWithEmailAndPassword(auth, email, password)

export const logout = () => signOut(auth)

export const resetPassword = (email) => sendPasswordResetEmail(auth, email)

export const reauthWithPassword = async (password) => {
  const user = auth.currentUser
  const credential = EmailAuthProvider.credential(user.email, password)
  await reauthenticateWithCredential(user, credential)
}

export const reauthWithGoogle = () => reauthenticateWithPopup(auth.currentUser, new GoogleAuthProvider())

export const reauthWithFacebook = () => reauthenticateWithPopup(auth.currentUser, new FacebookAuthProvider())

export const deleteAccount = () => deleteUser(auth.currentUser)

export const changePassword = async (oldPassword, newPassword) => {
  const user = auth.currentUser
  const credential = EmailAuthProvider.credential(user.email, oldPassword)
  await reauthenticateWithCredential(user, credential)
  await updatePassword(user, newPassword)
}
