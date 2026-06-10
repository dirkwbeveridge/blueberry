import LoadingScreen from '../components/shared/LoadingScreen';

// The root auth gate in app/_layout.tsx decides where to send the user
// (login vs tabs) based on session + household state. This route must NOT
// redirect on its own — an unconditional redirect races the gate and can
// strand the user. Render the loading screen until the gate navigates.
export default function IndexRoute() {
  return <LoadingScreen />;
}
