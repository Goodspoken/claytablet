package cmd

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

var meCmd = &cobra.Command{
	Use:   "me",
	Short: "Информация об авторизованном пользователе",
	PersistentPreRunE: func(cmd *cobra.Command, args []string) error { return nil },
	RunE: func(cmd *cobra.Command, args []string) error {
		server := viper.GetString("server")
		token := viper.GetString("token")

		if token == "" {
			fmt.Println("Не авторизован. Войди через: dubtab login")
			return nil
		}

		req, err := http.NewRequest("GET", server+"/api/auth/me", nil)
		if err != nil {
			return err
		}
		req.Header.Set("Authorization", "Bearer "+token)

		httpClient := &http.Client{Timeout: 10 * time.Second}
		resp, err := httpClient.Do(req)
		if err != nil {
			return fmt.Errorf("ошибка запроса: %w", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode == 401 {
			fmt.Println("Токен устарел. Войди заново: dubtab login")
			return nil
		}
		if resp.StatusCode != 200 {
			b, _ := io.ReadAll(resp.Body)
			return fmt.Errorf("ошибка %d: %s", resp.StatusCode, string(b))
		}

		var info map[string]any
		if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
			return fmt.Errorf("ошибка парсинга: %w", err)
		}

		fmt.Printf("Пользователь: %v\n", info["name"])
		fmt.Printf("Email:        %v\n", info["email"])
		if provider, ok := info["provider"]; ok {
			fmt.Printf("Провайдер:    %v\n", provider)
		}
		fmt.Printf("\nТекущая комната: %s\n", viper.GetString("room"))
		fmt.Printf("Сервер:          %s\n", server)
		return nil
	},
}

func init() {
	rootCmd.AddCommand(meCmd)
}
