"""dev-done-verify: 一次性完成 Layer 3-5 验证"""
import json
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT_DIR = Path("test_screenshots")
OUT_DIR.mkdir(exist_ok=True)
BASE = "http://localhost:5173"

console_errors = []
page_errors = []
failed_requests = []
api_responses = []


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        page = ctx.new_page()

        def on_console(msg):
            if msg.type in ("error", "warning"):
                console_errors.append({"type": msg.type, "text": msg.text[:300]})

        def on_pageerror(err):
            page_errors.append({"name": err.name, "message": str(err)[:300]})

        def on_request_failed(req):
            failed_requests.append({"url": req.url[:200], "failure": req.failure})

        def on_response(resp):
            url = resp.url
            if "/api/v1/" not in url:
                return
            try:
                body = resp.text()
                try:
                    j = json.loads(body)
                    data = j.get("data")
                    size = len(data) if isinstance(data, list) else (1 if isinstance(data, dict) else 0)
                    api_responses.append({
                        "url": url[:150], "status": resp.status,
                        "source": j.get("source"), "data_size": size
                    })
                except Exception:
                    api_responses.append({"url": url[:150], "status": resp.status, "raw": body[:100]})
            except Exception:
                pass

        page.on("console", on_console)
        page.on("pageerror", on_pageerror)
        page.on("requestfailed", on_request_failed)
        page.on("response", on_response)

        # ============ Layer 3: 前端渲染验证 ============
        routes = [
            ("/", "home"),
            ("/lof", "lof"),
            ("/convertible", "convertible"),
            ("/hkipo", "hkipo"),
            ("/closed-end", "closed_end"),
        ]

        print("=" * 60)
        print("Layer 3: 前端渲染验证")
        print("=" * 60)

        page_results = {}
        first_row_texts = {}
        for path, name in routes:
            print(f"\n--- {path} ---")
            page.goto(f"{BASE}{path}", wait_until="domcontentloaded")
            try:
                page.wait_for_load_state("networkidle", timeout=30000)
            except Exception:
                print(f"  [warn] networkidle 超时")
            page.wait_for_timeout(2000)
            page.screenshot(path=str(OUT_DIR / f"{name}.png"), full_page=True)

            table_rows = page.locator(".el-table__row, .mobile-card, .fund-mobile-card").count()
            stat_cards = page.locator(".overview-value, .card-value, .el-card").count()
            tier_badge = page.locator(".tier-badge, [class*='tier-badge']").count()
            timestamp = page.locator(".timestamp, [class*='time-stamp']").count()

            # 抓取第一行实际文本（不是元素数量）
            first_text = ""
            try:
                first_row = page.locator(".el-table__row, .mobile-card, .fund-mobile-card").first
                if first_row.count() > 0:
                    first_text = first_row.inner_text()[:200].replace("\n", " | ")
            except Exception:
                pass

            page_results[name] = {
                "table_rows": table_rows,
                "stat_cards": stat_cards,
                "tier_badge": tier_badge,
                "timestamp": timestamp,
            }
            first_row_texts[name] = first_text

            print(f"  rows={table_rows}, cards={stat_cards}, tier={tier_badge}, ts={timestamp}")
            print(f"  首行文本: {first_text}")

        # ============ Layer 4: 交互验证 ============
        print("\n" + "=" * 60)
        print("Layer 4: 交互验证")
        print("=" * 60)

        # 4.1 悬浮工具栏点击
        print("\n--- 4.1 悬浮工具栏点击 ---")
        page.goto(f"{BASE}/lof", wait_until="domcontentloaded")
        try:
            page.wait_for_load_state("networkidle", timeout=30000)
        except Exception:
            pass
        page.wait_for_timeout(2000)

        toolbar = page.locator(".float-toolbar, [class*='float-toolbar']").first
        panel_before = page.locator(".float-panel").count()
        if toolbar.count() > 0:
            toolbar.hover()
            page.wait_for_timeout(300)
            pet = page.locator(".pet-body").first
            try:
                pet.click(force=True, timeout=5000)
                page.wait_for_timeout(1000)
                panel_after = page.locator(".float-panel").count()
                print(f"  点击前 panel={panel_before}, 点击后 panel={panel_after}")
                if panel_after > panel_before:
                    print("  [OK] 悬浮工具栏点击打开面板")
                    page.screenshot(path=str(OUT_DIR / "float_panel.png"))
                else:
                    print("  [FAIL] 点击未打开面板")
                # 关闭面板
                close_btn = page.locator(".panel-close").first
                if close_btn.count() > 0:
                    close_btn.click(timeout=2000)
                    page.wait_for_timeout(500)
            except Exception as e:
                print(f"  [error] pet 点击失败: {e}")

        # 4.2 LOF 沙盘拖动
        print("\n--- 4.2 LOF 沙盘拖动 ---")
        sandbox_opened = False
        try:
            sandbox_header = page.locator(".sandbox-header").first
            sandbox_header.click(timeout=5000)
            page.wait_for_timeout(500)
            sandbox_opened = True
        except Exception as e:
            print(f"  [error] 沙盘展开失败: {e}")

        slider_dragged = False
        profit_before = ""
        if sandbox_opened:
            try:
                slider = page.locator(".el-slider__runway").first
                if slider.count() > 0:
                    box = slider.bounding_box()
                    if box:
                        # 先记录收益值
                        profit_el = page.locator(".result-value").first
                        profit_before = profit_el.inner_text() if profit_el.count() > 0 else ""
                        page.mouse.move(box["x"] + 20, box["y"] + 10)
                        page.mouse.down()
                        page.mouse.move(box["x"] + box["width"] - 20, box["y"] + 10, steps=10)
                        page.mouse.up()
                        page.wait_for_timeout(500)
                        profit_after_el = page.locator(".result-value").first
                        profit_after = profit_after_el.inner_text() if profit_after_el.count() > 0 else ""
                        print(f"  拖动前收益: {profit_before}")
                        print(f"  拖动后收益: {profit_after}")
                        slider_dragged = profit_after != profit_before
                        print(f"  [OK] 沙盘拖动生效" if slider_dragged else "  [FAIL] 收益未变化")
                        page.screenshot(path=str(OUT_DIR / "sandbox_after.png"))
                else:
                    print("  [warn] 无 slider 元素")
            except Exception as e:
                print(f"  [error] 沙盘拖动失败: {e}")

        # 4.3 ClosedEnd Tab 切换
        print("\n--- 4.3 ClosedEnd Tab 切换 ---")
        page.goto(f"{BASE}/closed-end", wait_until="domcontentloaded")
        try:
            page.wait_for_load_state("networkidle", timeout=30000)
        except Exception:
            pass
        page.wait_for_timeout(3000)

        tab_results = {}
        for tab_text in ['全部', '折价(>0)', '高折价(≥5%)', '溢价(<0)']:
            try:
                page.locator(f".tab-btn:has-text('{tab_text}')").click(timeout=3000)
                page.wait_for_timeout(500)
                visible_rows = page.locator(".el-table__row:visible").count()
                tab_results[tab_text] = visible_rows
                print(f"  Tab [{tab_text}] -> 可见行: {visible_rows}")
            except Exception as e:
                print(f"  Tab [{tab_text}] 失败: {e}")
                tab_results[tab_text] = -1

        browser.close()

        # ============ Layer 5: 错误扫描汇总 ============
        print("\n" + "=" * 60)
        print("Layer 5: 错误扫描汇总")
        print("=" * 60)
        print(f"\nconsole 错误数: {len(console_errors)}")
        for e in console_errors[:10]:
            print(f"  [{e['type']}] {e['text'][:200]}")
        print(f"\n页面 JS 异常数: {len(page_errors)}")
        for e in page_errors[:5]:
            print(f"  [{e['name']}] {e['message'][:200]}")
        print(f"\n失败网络请求数: {len(failed_requests)}")
        for r in failed_requests[:5]:
            print(f"  {r['url']} -> {r['failure']}")

        print("\n" + "=" * 60)
        print("API 响应汇总")
        print("=" * 60)
        for r in api_responses[:15]:
            if 'source' in r:
                print(f"  [{r['status']}] source={r['source']} size={r['data_size']} | {r['url']}")
            else:
                print(f"  [{r['status']}] {r['url']} raw={r.get('raw', '')[:80]}")

        # ============ 最终汇总 ============
        print("\n" + "=" * 60)
        print("===== dev-done-verify 验证结果汇总 =====")
        print("=" * 60)

        print("\n[Layer 3 前端渲染]")
        all_render_ok = True
        for n, r in page_results.items():
            ok = r["table_rows"] > 0 or r["stat_cards"] > 0
            flag = "PASS" if ok else "FAIL"
            if not ok:
                all_render_ok = False
            print(f"  [{flag}] {n:15s} rows={r['table_rows']:4d} cards={r['stat_cards']:3d} tier={r['tier_badge']} ts={r['timestamp']}")
            print(f"         首行: {first_row_texts[n][:100]}")

        print(f"\n[Layer 4 交互]")
        print(f"  悬浮工具栏点击: {'PASS' if panel_after > panel_before else 'FAIL'}")
        print(f"  LOF 沙盘拖动:   {'PASS' if slider_dragged else 'FAIL'}")
        ce_tab_ok = all(v >= 0 for v in tab_results.values())
        print(f"  ClosedEnd Tab:   {'PASS' if ce_tab_ok else 'FAIL'}")
        for k, v in tab_results.items():
            print(f"    - {k}: {v} 行")

        print(f"\n[Layer 5 错误扫描]")
        err_ok = len(console_errors) == 0 and len(page_errors) == 0 and len(failed_requests) == 0
        print(f"  console errors:  {len(console_errors)} {'PASS' if len(console_errors) == 0 else 'FAIL'}")
        print(f"  page errors:     {len(page_errors)} {'PASS' if len(page_errors) == 0 else 'FAIL'}")
        print(f"  failed requests: {len(failed_requests)} {'PASS' if len(failed_requests) == 0 else 'FAIL'}")

        print("\n" + "=" * 60)
        overall = all_render_ok and panel_after > panel_before and slider_dragged and ce_tab_ok and err_ok
        print(f"总体结果: {'ALL PASS ✅' if overall else 'HAS FAILURES ❌'}")
        print("=" * 60)


if __name__ == "__main__":
    run()
