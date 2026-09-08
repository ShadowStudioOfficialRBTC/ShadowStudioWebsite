import gymnasium as gym
from stable_baselines3 import DQN

def main():
    # 1. Create the Gymnasium LunarLander environment
    # Use "LunarLander-v3" for the latest version in Gymnasium
    env_id = "LunarLander-v3"
    env = gym.make(env_id, render_mode=None) # Set to "human" if you want to watch it train live

    print(f"Initialized environment: {env_id}")
    print(f"Action Space: {env.action_space}")
    print(f"Observation Space: {env.observation_space}")

    # 2. Initialize the Deep Q-Network (DQN) model
    # MlpPolicy is standard for state vectors like LunarLander's 8D observation space
    model = DQN(
        "MlpPolicy",
        env,
        learning_rate=1e-3,
        buffer_size=50000,
        learning_starts=1000,
        batch_size=64,
        gamma=0.99,
        verbose=1
    )

    # 3. Train the model
    print("Starting training...")
    total_timesteps = 100_000
    model.learn(total_timesteps=total_timesteps)
    print("Training finished!")

    # 4. Save the trained model
    model_path = "dqn_lunar_lander"
    model.save(model_path)
    print(f"Model saved to {model_path}.zip")

    # 5. Evaluate the trained agent
    print("Running evaluation loop...")
    eval_env = gym.make(env_id, render_mode="human")
    obs, info = eval_env.reset()
    
    for _ in range(1000):
        action, _states = model.predict(obs, deterministic=True)
        obs, reward, terminated, truncated, info = eval_env.step(action)
        
        if terminated or truncated:
            obs, info = eval_env.reset()

    eval_env.close()

if __name__ == "__main__":
    main()