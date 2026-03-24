import { Button, Center, Stack, Text } from '@mantine/core';
import { Link } from 'react-router-dom';
import opaaImage from '../assets/oxxxy-opaaa.jpg';

export function NotFoundPage() {
  return (
    <Center className="not-found-page">
      <Stack align="center" gap="xl" className="not-found-stack">
        <div className="not-found-hero" aria-hidden="true">
          <div className="not-found-code">404</div>
          <div className="not-found-image-stage">
            <div className="not-found-image-flip">
              <img src={opaaImage} alt="" className="not-found-image not-found-image-front" />
              <img src={opaaImage} alt="" className="not-found-image not-found-image-back" />
            </div>
          </div>
        </div>

        <Stack align="center" gap={6}>
          <Text c="dimmed" ta="center">
            Зато есть драматичное появление картинки. Уже неплохо.
          </Text>
        </Stack>

        <Button component={Link} to="/ads" size="md" radius="xl" className="back-button">
          Вернуться к объявлениям
        </Button>
      </Stack>
    </Center>
  );
}
