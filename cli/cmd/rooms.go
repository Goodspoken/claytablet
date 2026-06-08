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

type roomInfo struct {
	ID           string  `json:"id"`
	TTL          string  `json:"ttl"`
	LastActivity float64 `json:"last_activity"`
}

var roomsCmd = &cobra.Command{
	Use:   "rooms",
	Short: "Список твоих личных комнат (требует логина)",
	Example: `  claytablet rooms
  claytablet rooms --switch my-room   # переключиться на комнату`,
	RunE: func(cmd *cobra.Command, args []string) error {
		server := viper.GetString("server")
		token := viper.GetString("token")

		if token == "" {
			return fmt.Errorf("не авторизован. Сначала запусти: claytablet login")
		}

		req, err := http.NewRequest("GET", server+"/api/auth/me/rooms", nil)
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
			return fmt.Errorf("токен устарел. Запусти: claytablet login")
		}
		if resp.StatusCode != 200 {
			b, _ := io.ReadAll(resp.Body)
			return fmt.Errorf("ошибка %d: %s", resp.StatusCode, string(b))
		}

		var rooms []roomInfo
		if err := json.NewDecoder(resp.Body).Decode(&rooms); err != nil {
			return fmt.Errorf("ошибка парсинга: %w", err)
		}

		if len(rooms) == 0 {
			fmt.Println("У тебя пока нет личных комнат.")
			fmt.Println("Создай комнату на сайте и она появится здесь.")
			return nil
		}

		current := viper.GetString("room")
		numWidth := len(fmt.Sprintf("%d", len(rooms)))
		fmt.Printf("┌─ Твои комнаты (%d) ─\n", len(rooms))
		for i, r := range rooms {
			marker := " "
			if r.ID == current {
				marker = "▶"
			}
			ts := time.Unix(int64(r.LastActivity), 0).Format("2006-01-02 15:04")

			connector := "├"
			if i == len(rooms)-1 {
				connector = "└"
			}
			num := fmt.Sprintf("%*d.", numWidth, i+1)
			fmt.Printf("%s%s %s %s  [ttl: %s]  %s\n", connector, marker, num, r.ID, r.TTL, ts)
		}

		switchRoom, _ := cmd.Flags().GetString("switch")
		if switchRoom != "" {
			viper.Set("room", switchRoom)
			viper.WriteConfig()
			fmt.Printf("\n✓ Текущая комната → %s\n", switchRoom)
		} else if len(rooms) > 1 {
			fmt.Printf("\nПереключиться: claytablet rooms --switch <room-id> или claytablet room <id>\n")
		}

		return nil
	},
}

func init() {
	roomsCmd.Flags().String("switch", "", "переключиться на указанную комнату")
	// rooms не требует room в конфиге
	roomsCmd.PersistentPreRunE = func(cmd *cobra.Command, args []string) error {
		server := viper.GetString("server")
		if server == "" {
			viper.Set("server", "https://claytablet.online")
		}
		return nil
	}
	rootCmd.AddCommand(roomsCmd)
}
